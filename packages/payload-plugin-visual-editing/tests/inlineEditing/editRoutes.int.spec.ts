import { describe, expect, it } from "vitest";

import { createEditRoutes } from "../../src/client/inlineEditing/editRoutes";

const TITLE = { collectionSlug: "page", docId: "1", key: "title", kind: "collection" } as const;

const BODY = { ...TITLE, key: "body" };

type PageWindow = { parent: unknown; opener: unknown };

const adminWindow = () => ({ closed: false }) as unknown as Window;

const pageOpenedBy = (opener: Window | null): PageWindow => {
  const page: PageWindow = { opener, parent: null };
  page.parent = page;
  return page;
};

const pageOfItsOwn = () => pageOpenedBy(null);

const framedPage = (admin: Window): PageWindow => ({ opener: null, parent: admin });

const routesOf = (page: PageWindow, holdsAnyForm = () => false) =>
  createEditRoutes({ holdsAnyForm, win: page as unknown as Window });

const nothingUnsaved = () => false;

const everythingUnsaved = () => true;

describe("the routes of the edits of a page", () => {
  describe("the admin a new edit goes to", () => {
    it("is the window that frames the page", () => {
      const admin = adminWindow();

      expect(routesOf(framedPage(admin)).currentAdmin()).toBe(admin);
    });

    it("is none for a page of its own", () => {
      expect(routesOf(pageOfItsOwn()).currentAdmin()).toBeNull();
    });

    it("is the window that opened the page only once it told of a form", () => {
      const admin = adminWindow();
      let holdsAnyForm = false;
      const routes = routesOf(pageOpenedBy(admin), () => holdsAnyForm);
      expect(routes.currentAdmin()).toBeNull();

      holdsAnyForm = true;

      expect(routes.currentAdmin()).toBe(admin);
    });

    it("is none once the window that opened the page is closed", () => {
      const admin = { closed: true } as unknown as Window;

      expect(routesOf(pageOpenedBy(admin), () => true).currentAdmin()).toBeNull();
    });
  });

  describe("an edit", () => {
    it("of a field that began no edit goes where a new edit goes", () => {
      const admin = adminWindow();

      expect(routesOf(framedPage(admin)).adminOf(TITLE)).toBe(admin);
    });

    it("begun through the endpoint stays there once the admin told of a form", () => {
      let holdsAnyForm = false;
      const routes = routesOf(pageOpenedBy(adminWindow()), () => holdsAnyForm);
      routes.beginEdit(TITLE, nothingUnsaved);

      holdsAnyForm = true;

      expect(routes.adminOf(TITLE)).toBeNull();
      expect(routes.adminOf(BODY)).not.toBeNull();
    });

    it("begun in the admin goes to the endpoint once that window is replaced", () => {
      const page = framedPage(adminWindow());
      const routes = routesOf(page);
      routes.beginEdit(TITLE, nothingUnsaved);

      page.parent = adminWindow();

      expect(routes.adminOf(TITLE)).toBeNull();
    });

    it("begun in the admin goes to the endpoint once that window is closed", () => {
      const admin = adminWindow();
      const routes = routesOf(pageOpenedBy(admin), () => true);
      routes.beginEdit(TITLE, nothingUnsaved);

      Object.assign(admin, { closed: true });

      expect(routes.adminOf(TITLE)).toBeNull();
    });

    it("takes the route of the moment it begins again", () => {
      let holdsAnyForm = false;
      const admin = adminWindow();
      const routes = routesOf(pageOpenedBy(admin), () => holdsAnyForm);
      routes.beginEdit(TITLE, nothingUnsaved);
      holdsAnyForm = true;

      routes.beginEdit(TITLE, nothingUnsaved);

      expect(routes.adminOf(TITLE)).toBe(admin);
    });
  });

  describe("a new edit", () => {
    it("releases the route of an edit of another field that left nothing unsaved", () => {
      let holdsAnyForm = false;
      const admin = adminWindow();
      const routes = routesOf(pageOpenedBy(admin), () => holdsAnyForm);
      routes.beginEdit(TITLE, nothingUnsaved);
      holdsAnyForm = true;

      routes.beginEdit(BODY, nothingUnsaved);

      expect(routes.adminOf(TITLE)).toBe(admin);
    });

    it("keeps the route of an edit of another field that left something unsaved", () => {
      let holdsAnyForm = false;
      const routes = routesOf(pageOpenedBy(adminWindow()), () => holdsAnyForm);
      routes.beginEdit(TITLE, nothingUnsaved);
      holdsAnyForm = true;

      routes.beginEdit(BODY, everythingUnsaved);

      expect(routes.adminOf(TITLE)).toBeNull();
    });
  });

  describe("the drawer of the admin", () => {
    it("is the window that frames the page, as the edit began with it", () => {
      const page = framedPage(adminWindow());
      const routes = routesOf(page);
      routes.beginEdit(TITLE, nothingUnsaved);
      const admin = page.parent;

      expect(routes.drawerOf(TITLE)).toBe(admin);

      page.parent = adminWindow();

      expect(routes.drawerOf(TITLE)).toBeNull();
    });

    it("is none in a window the admin opened", () => {
      const routes = routesOf(pageOpenedBy(adminWindow()), () => true);
      routes.beginEdit(TITLE, nothingUnsaved);

      expect(routes.drawerOf(TITLE)).toBeNull();
    });
  });
});
