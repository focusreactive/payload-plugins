import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const PREFIX = "frcomments";

const COMPONENT_CLASS_PREFIX = "frcomments-";

export function prefixClassList(classList: string): string {
  return classList
    .split(/(\s+)/u)
    .map((part) => {
      if (part === "" || /^\s+$/u.test(part)) {
        return part;
      }
      if (part.startsWith(`${PREFIX}:`) || part.startsWith(COMPONENT_CLASS_PREFIX)) {
        return part;
      }
      return `${PREFIX}:${part}`;
    })
    .join("");
}

type Replacement = {
  start: number;
  end: number;
  text: string;
};

export function transformSource(
  code: string,
  fileName: string
): { code: string; changed: boolean } {
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS
  );
  const replacements: Replacement[] = [];

  const fail = (node: ts.Node, message: string): never => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    throw new Error(`[prefix-classes] ${fileName}:${line + 1}:${character + 1} — ${message}`);
  };

  const replaceLiteral = (node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral): void => {
    const next = prefixClassList(node.text);
    if (next !== node.text) {
      replacements.push({
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        text: JSON.stringify(next),
      });
    }
  };

  const transformClassSubtree = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      replaceLiteral(node);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      fail(
        node,
        "template literal with substitutions in a class-list position; use cn() with string literals"
      );
    }
    if (ts.isConditionalExpression(node)) {
      transformClassSubtree(node.whenTrue);
      transformClassSubtree(node.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        transformClassSubtree(node.right);
      }
      return;
    }
    if (ts.isParenthesizedExpression(node)) {
      transformClassSubtree(node.expression);
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        transformClassSubtree(element);
      }
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.name)) {
          replaceLiteral(prop.name);
        }
      }
      return;
    }
    // Calls, identifiers, property access, etc.: never descend.
  };

  const propName = (name: ts.PropertyName): string | undefined => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      return name.text;
    }
    return undefined;
  };

  const transformCva = (call: ts.CallExpression): void => {
    const [base, config] = call.arguments;
    if (base) {
      transformClassSubtree(base);
    }
    if (!(config && ts.isObjectLiteralExpression(config))) {
      return;
    }
    for (const prop of config.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        continue;
      }
      const key = propName(prop.name);
      if (key === "variants" && ts.isObjectLiteralExpression(prop.initializer)) {
        for (const group of prop.initializer.properties) {
          if (ts.isPropertyAssignment(group) && ts.isObjectLiteralExpression(group.initializer)) {
            for (const option of group.initializer.properties) {
              if (ts.isPropertyAssignment(option)) {
                transformClassSubtree(option.initializer);
              }
            }
          }
        }
      }
      if (key === "compoundVariants" && ts.isArrayLiteralExpression(prop.initializer)) {
        for (const entry of prop.initializer.elements) {
          if (!ts.isObjectLiteralExpression(entry)) {
            continue;
          }
          for (const entryProp of entry.properties) {
            if (
              ts.isPropertyAssignment(entryProp) &&
              (propName(entryProp.name) === "class" || propName(entryProp.name) === "className")
            ) {
              transformClassSubtree(entryProp.initializer);
            }
          }
        }
      }
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && propName(node.name) === "className") {
      transformClassSubtree(node.initializer);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === "cn") {
        for (const arg of node.arguments) {
          transformClassSubtree(arg);
        }
      } else if (node.expression.text === "cva") {
        transformCva(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (replacements.length === 0) {
    return { code, changed: false };
  }
  let result = code;
  for (const { start, end, text } of replacements.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + text + result.slice(end);
  }
  return { code: result, changed: true };
}

export function transformDistDirectory(dir: string): number {
  let changedCount = 0;
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!(entry.isFile() && entry.name.endsWith(".js"))) {
      continue;
    }
    const filePath = join(entry.parentPath, entry.name);
    const source = readFileSync(filePath, "utf-8");
    const { code: nextCode, changed } = transformSource(source, filePath);
    if (changed) {
      writeFileSync(filePath, nextCode);
      changedCount += 1;
    }
  }
  return changedCount;
}
