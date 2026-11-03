# Good run: npx tsx scripts/check-readme.ts
README.md: 17 code blocks compile
exit=0

# Failing run: line 62 (blank line inside first ts block) replaced with: const brokenValue: number = "not a number";
README.md:62:7: error TS2322: Type 'string' is not assignable to type 'number'.
exit=1

# README restored with git checkout -- README.md
# Failing run 2: line 6 image link pointed at screenshots/missing.png
README.md links to files that do not exist: screenshots/missing.png
exit=1
# README restored
