import { describe, expect, it } from "vitest";
import { isBroad, toChoice, toChoiceFromGeocoder } from "./locate";

describe("isBroad", () => {
  it("flags cities, districts, provinces and countries, not streets or landmarks", () => {
    expect(isBroad(["locality", "political"])).toBe(true);
    expect(isBroad(["administrative_area_level_2", "political"])).toBe(true);
    expect(isBroad(["sublocality_level_1"])).toBe(true);
    expect(isBroad(["route"])).toBe(false);
    expect(isBroad(["shopping_mall", "point_of_interest"])).toBe(false);
    expect(isBroad(["neighborhood"])).toBe(false);
    expect(isBroad(undefined)).toBe(false);
  });
});

describe("toChoice", () => {
  const street = {
    id: "ChIJabc",
    displayName: { text: "Session Road" },
    formattedAddress: "Session Rd, Baguio, 2600 Benguet, Philippines",
    location: { latitude: 16.4115, longitude: 120.5953 },
    types: ["route"],
  };
  it("maps a Google place to a choice", () => {
    expect(toChoice(street)).toEqual({
      id: "ChIJabc", label: "Session Road", address: "Session Rd, Baguio, 2600 Benguet, Philippines",
      lat: 16.4115, lng: 120.5953, broad: false,
    });
  });
  it("marks a city as broad", () => {
    expect(toChoice({ ...street, displayName: { text: "Baguio" }, types: ["locality", "political"] })?.broad).toBe(true);
  });
  it("skips places without coordinates or a name", () => {
    expect(toChoice({ ...street, location: undefined })).toBeNull();
    expect(toChoice({ ...street, displayName: undefined })).toBeNull();
    expect(toChoice(null)).toBeNull();
  });
});

describe("toChoiceFromGeocoder", () => {
  it("maps Open-Meteo results and always treats them as broad", () => {
    expect(toChoiceFromGeocoder({ id: 1, name: "Baguio", admin1: "Benguet", country: "Philippines", latitude: 16.4, longitude: 120.6 })).toEqual({
      id: "1", label: "Baguio", address: "Baguio, Benguet, Philippines", lat: 16.4, lng: 120.6, broad: true,
    });
    expect(toChoiceFromGeocoder({ name: "x" })).toBeNull();
  });
});
