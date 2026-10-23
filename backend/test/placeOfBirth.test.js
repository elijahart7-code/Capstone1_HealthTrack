import test from "node:test";
import assert from "node:assert/strict";
import { loadPsgcArea, loadPsgcIndex, validatePlaceOfBirth } from "../src/utils/placeOfBirth.js";

const index = await loadPsgcIndex();

test("PSGC snapshot includes all 18 regions and preserves code strings", () => {
  assert.equal(index.regions.length, 18);
  assert.ok(index.regions.every((region) => typeof region.code === "string" && /^\d{10}$/.test(region.code)));
});

test("all province and independent-area files load and contain barangay data", async () => {
  const scopes = index.regions.flatMap((region) => [...region.provinces, ...region.independent]);
  assert.equal(scopes.length, 118);
  const areas = await Promise.all(scopes.map(({ code }) => loadPsgcArea(code)));
  assert.ok(areas.every((area) => area && area.cities.length > 0));
  assert.equal(areas.reduce((total, area) => total + area.cities.reduce((count, city) => count + city.barangays.length, 0), 0), 42010);
});

test("NIR contains Negros Occidental, Negros Oriental, and Siquijor", () => {
  const nir = index.regions.find(({ code }) => code === "1800000000");
  assert.deepEqual(nir.provinces.map(({ name }) => name), ["Negros Occidental", "Negros Oriental", "Siquijor"]);
});

test("BARMM Special Geographic Area is validated as an area, not a province", async () => {
  const area = await loadPsgcArea("1999900000");
  const city = area.cities[0];
  const valid = await validatePlaceOfBirth({
    region_code: "1900000000",
    area_code: "1999900000",
    scope_type: "administrative_area",
    city_code: city.code,
    barangay_code: city.barangays[0][0],
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.value.province_code, null);
  assert.equal(valid.value.area_name, "Special Geographic Area");

  const invalid = await validatePlaceOfBirth({
    region_code: "1900000000",
    province_code: "1999900000",
    city_code: city.code,
  });
  assert.match(invalid.error, /not a province/);
});

test("NCR has no provinces and includes 16 cities and Pateros", () => {
  const ncr = index.regions.find(({ code }) => code === "1300000000");
  assert.deepEqual(ncr.provinces, []);
  assert.equal(ncr.independent.length, 17);
  assert.ok(ncr.independent.some(({ name, type }) => name === "Pateros" && type === "municipality"));
});

test("accepts a valid NIR province, city, and barangay chain", async () => {
  const result = await validatePlaceOfBirth({
    region_code: "1800000000",
    province_code: "1804500000",
    area_code: "1804500000",
    city_code: "1804502000",
    barangay_code: "1804502001",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.verified, true);
  assert.match(result.display, /Negros Island Region/);
});

test("accepts an NCR independent city without a province", async () => {
  const area = await loadPsgcArea("1381300000");
  const barangayCode = area.cities[0].barangays[0][0];
  const result = await validatePlaceOfBirth({
    region_code: "1300000000",
    area_code: "1381300000",
    city_code: "1381300000",
    barangay_code: barangayCode,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.value.province_code, null);
  assert.equal(result.verified, true);
});

test("rejects a province or city outside the submitted parent", async () => {
  const wrongProvince = await validatePlaceOfBirth({
    region_code: "0200000000",
    province_code: "1804500000",
    area_code: "1804500000",
    city_code: "1804502000",
  });
  assert.match(wrongProvince.error, /does not belong/);

  const wrongCity = await validatePlaceOfBirth({
    region_code: "1800000000",
    province_code: "1804500000",
    area_code: "1804500000",
    city_code: "1804601000",
  });
  assert.match(wrongCity.error, /does not belong/);
});

test("accepts custom location text but marks it unverified", async () => {
  const result = await validatePlaceOfBirth({
    region_code: "1800000000",
    custom_province_selected: true,
    custom_province: "Unlisted area",
    custom_city_selected: true,
    custom_city: "Unlisted town",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.verified, false);
  assert.equal(result.value.province_code, null);
  assert.equal(result.value.city_code, null);
});
