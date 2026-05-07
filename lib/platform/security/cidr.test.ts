import { describe, it, expect } from "vitest";
import { isValidIpv4Cidr, normalizeCidr } from "./cidr";

describe("isValidIpv4Cidr", () => {
  it("accepts canonical CIDRs", () => {
    expect(isValidIpv4Cidr("10.0.0.0/8")).toBe(true);
    expect(isValidIpv4Cidr("192.168.1.0/24")).toBe(true);
    expect(isValidIpv4Cidr("0.0.0.0/0")).toBe(true);
    expect(isValidIpv4Cidr("172.16.0.0/12")).toBe(true);
    expect(isValidIpv4Cidr("203.0.113.42/32")).toBe(true);
  });

  it("rejects missing slash", () => {
    expect(isValidIpv4Cidr("10.0.0.0")).toBe(false);
  });

  it("rejects out-of-range octets", () => {
    expect(isValidIpv4Cidr("256.0.0.0/24")).toBe(false);
    expect(isValidIpv4Cidr("10.0.0.300/8")).toBe(false);
  });

  it("rejects out-of-range prefix length", () => {
    expect(isValidIpv4Cidr("10.0.0.0/33")).toBe(false);
    expect(isValidIpv4Cidr("10.0.0.0/-1")).toBe(false);
  });

  it("rejects empty / whitespace", () => {
    expect(isValidIpv4Cidr("")).toBe(false);
    expect(isValidIpv4Cidr("   ")).toBe(false);
  });

  it("rejects non-string", () => {
    expect(isValidIpv4Cidr(123 as unknown as string)).toBe(false);
    expect(isValidIpv4Cidr(null as unknown as string)).toBe(false);
  });

  it("rejects IPv6 (we only do v4 in this iteration)", () => {
    expect(isValidIpv4Cidr("::1/128")).toBe(false);
    expect(isValidIpv4Cidr("2001:db8::/32")).toBe(false);
  });

  it("rejects extra dots / segments", () => {
    expect(isValidIpv4Cidr("10.0.0.0.0/8")).toBe(false);
    expect(isValidIpv4Cidr("10.0.0/8")).toBe(false);
  });
});

describe("normalizeCidr", () => {
  it("trims and returns the cidr when valid", () => {
    expect(normalizeCidr("  10.0.0.0/8  ")).toBe("10.0.0.0/8");
  });
  it("returns null when invalid", () => {
    expect(normalizeCidr("nope")).toBeNull();
    expect(normalizeCidr("256.0.0.0/8")).toBeNull();
  });
});
