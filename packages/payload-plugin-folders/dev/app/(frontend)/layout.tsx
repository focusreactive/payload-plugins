import type { ReactNode } from "react";

import { Nav } from "./nav.js";

// Spec section 10.3 asks for no styling: the markup below is the whole frontend.
const FrontendLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>
      <Nav />
      <main>{children}</main>
    </body>
  </html>
);

export default FrontendLayout;
