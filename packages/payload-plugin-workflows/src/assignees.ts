// Who a run waits on, stored as one indexed text column on the run: `|u:<user id>|r:<role>|`, or
// `null` when it waits on nobody in particular. "For me" is a `contains` match on a token. No
// imports: the admin's list cell decodes it too.

export interface Assignees {
  users: string[];
  roles: string[];
}

/** The token a user id or a role is stored as; `contains` matches it whole. */
export const userToken = (id: string): string => `|u:${id}|`;
export const roleToken = (role: string): string => `|r:${role}|`;

export const encodeAssignees = ({ users, roles }: Assignees): string | null => {
  const tokens = [...users.map((id) => `u:${id}`), ...roles.map((role) => `r:${role}`)];
  return tokens.length > 0 ? `|${tokens.join("|")}|` : null;
};

export const decodeAssignees = (value: unknown): Assignees => {
  const users: string[] = [];
  const roles: string[] = [];
  for (const token of typeof value === "string" ? value.split("|") : []) {
    if (token.startsWith("u:")) {
      users.push(token.slice(2));
    } else if (token.startsWith("r:")) {
      roles.push(token.slice(2));
    }
  }
  return { users, roles };
};
