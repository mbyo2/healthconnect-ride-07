import { describe, it, expect } from "vitest";
import { splitPatientName, buildFindOrCreateParams } from "@/lib/patients";

describe("splitPatientName", () => {
  it("splits a two-part name", () => {
    expect(splitPatientName("Mary Banda")).toEqual({
      firstName: "Mary",
      lastName: "Banda",
    });
  });

  it("keeps middle names with the last name", () => {
    expect(splitPatientName("Mary Anne Banda")).toEqual({
      firstName: "Mary",
      lastName: "Anne Banda",
    });
  });

  it("mirrors a mononym so the service always receives a last name", () => {
    expect(splitPatientName("Madonna")).toEqual({
      firstName: "Madonna",
      lastName: "Madonna",
    });
  });

  it("trims and collapses whitespace", () => {
    expect(splitPatientName("  John   Mwanza  ")).toEqual({
      firstName: "John",
      lastName: "Mwanza",
    });
  });

  it("handles an empty string", () => {
    expect(splitPatientName("   ")).toEqual({ firstName: "", lastName: "" });
  });
});

describe("buildFindOrCreateParams", () => {
  it("maps form fields to the RPC parameter names", () => {
    const params = buildFindOrCreateParams(
      "inst-1",
      {
        firstName: " Mary ",
        lastName: "Banda",
        phone: " +260 97 000 0000 ",
        email: " Mary@Example.com ",
        dateOfBirth: "1990-05-01",
        gender: "female",
        allergies: " Penicillin ",
      },
      "queue",
    );
    expect(params.p_institution_id).toBe("inst-1");
    expect(params.p_first_name).toBe("Mary");
    expect(params.p_last_name).toBe("Banda");
    expect(params.p_phone).toBe("+260 97 000 0000");
    expect(params.p_email).toBe("Mary@Example.com");
    expect(params.p_date_of_birth).toBe("1990-05-01");
    expect(params.p_gender).toBe("female");
    expect(params.p_allergies).toBe("Penicillin");
    expect(params.p_source).toBe("queue");
  });

  it("sends nulls for absent optional fields and defaults the source", () => {
    const params = buildFindOrCreateParams("inst-2", {
      firstName: "John",
      lastName: "Mwanza",
    });
    expect(params.p_phone).toBeNull();
    expect(params.p_email).toBeNull();
    expect(params.p_date_of_birth).toBeNull();
    expect(params.p_blood_type).toBeNull();
    expect(params.p_source).toBe("registration");
  });

  it("treats blank strings as absent", () => {
    const params = buildFindOrCreateParams("inst-3", {
      firstName: "A",
      lastName: "B",
      phone: "   ",
      email: "",
    });
    expect(params.p_phone).toBeNull();
    expect(params.p_email).toBeNull();
  });
});
