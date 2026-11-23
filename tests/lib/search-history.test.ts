import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_RECENT,
  addRecent,
  clearRecent,
  forgetPlace,
  parseRecent,
  recentKey,
  rememberPlace,
  removeRecent,
  type RecentPlace,
} from "@/lib/searchHistory";

const place = (name: string, country = "Nigeria", region = ""): RecentPlace => ({ name, region, country, lat: 6.45, lon: 3.39 });
const names = (list: RecentPlace[]) => list.map((item) => item.name);

afterEach(() => localStorage.clear());

describe("addRecent", () => {
  it("puts the newest place first", () => {
    const list = addRecent(addRecent([], place("Lagos")), place("Abuja"));
    expect(names(list)).toEqual(["Abuja", "Lagos"]);
  });

  it("moves a place to the top instead of adding it twice (ignoring case and accents)", () => {
    let list = [place("Lagos"), place("Abuja"), place("Accra", "Ghana")];
    list = addRecent(list, place("LAGOS", "nigeria"));
    expect(names(list)).toEqual(["LAGOS", "Abuja", "Accra"]);
    list = addRecent(list, place("Sao Paulo", "Brazil"));
    list = addRecent(list, place("São Paulo", "Brazil"));
    expect(list.filter((item) => item.name.endsWith("Paulo"))).toHaveLength(1);
  });

  it("keeps same-named places in different countries apart", () => {
    const list = addRecent(addRecent([], place("Lagos", "Nigeria")), place("Lagos", "Portugal"));
    expect(list).toHaveLength(2);
  });

  it("keeps at most 5, dropping the oldest", () => {
    let list: RecentPlace[] = [];
    for (const name of ["A", "B", "C", "D", "E", "F", "G"]) list = addRecent(list, place(name));
    expect(list).toHaveLength(MAX_RECENT);
    expect(names(list)).toEqual(["G", "F", "E", "D", "C"]);
  });

  it("stores only name, region, country, lat and lon", () => {
    const [entry] = addRecent([], { ...place("Lagos"), id: "x", kind: "city" } as RecentPlace);
    expect(Object.keys(entry).sort()).toEqual(["country", "lat", "lon", "name", "region"]);
  });
});

describe("removeRecent and parseRecent", () => {
  it("removes one place by its key", () => {
    const list = [place("Lagos"), place("Abuja")];
    expect(names(removeRecent(list, recentKey(place("lagos"))))).toEqual(["Abuja"]);
  });

  it("ignores damaged or unexpected stored values", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent('{"name":"Lagos"}')).toEqual([]);
    expect(parseRecent(JSON.stringify([place("Lagos"), { name: "Bad", lat: "x" }]))).toEqual([place("Lagos")]);
  });
});

describe("stored history", () => {
  it("remembers, forgets and clears places in localStorage", () => {
    rememberPlace(place("Lagos"));
    rememberPlace(place("Accra", "Ghana"));
    expect(names(parseRecent(localStorage.getItem("weather-app:search-history")))).toEqual(["Accra", "Lagos"]);

    forgetPlace(recentKey(place("Accra", "Ghana")));
    expect(names(parseRecent(localStorage.getItem("weather-app:search-history")))).toEqual(["Lagos"]);

    clearRecent();
    expect(localStorage.getItem("weather-app:search-history")).toBeNull();
  });
});
