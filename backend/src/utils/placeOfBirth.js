import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PSGC_DIR = path.resolve(HERE, "../../../frontend/public/data/psgc");
let indexPromise;
const areaPromises = new Map();

export function loadPsgcIndex() {
  indexPromise ||= readFile(path.join(PSGC_DIR, "index.json"), "utf8").then(JSON.parse);
  return indexPromise;
}

export function loadPsgcArea(code) {
  if (!/^\d{10}$/.test(String(code || ""))) return Promise.resolve(null);
  if (!areaPromises.has(code)) {
    areaPromises.set(code, readFile(path.join(PSGC_DIR, "areas", `${code}.json`), "utf8")
      .then(JSON.parse)
      .catch(() => null));
  }
  return areaPromises.get(code);
}

/** Validate every supplied code against its actual PSGC parent; derive names server-side. */
export async function validatePlaceOfBirth(input) {
  if (!input || typeof input !== "object") return { error: "Place of birth details are required." };
  const index = await loadPsgcIndex();
  const region = index.regions.find((item) => item.code === input.region_code);
  if (!region) return { error: "Select a valid PSGC region for place of birth." };

  let province = null;
  let independent = null;
  let administrativeArea = null;
  if (input.province_code) {
    province = region.provinces.find((item) => item.code === input.province_code);
    if (!province) return { error: "The selected province does not belong to the selected region." };
    if (province.name === "Special Geographic Area") return { error: "BARMM's Special Geographic Area is not a province; select it as an administrative area." };
    if (input.area_code && input.area_code !== province.code) {
      return { error: "The selected geographic area does not match the selected province." };
    }
  } else if (input.area_code) {
    independent = region.independent.find((item) => item.code === input.area_code);
    administrativeArea = region.provinces.find((item) => item.code === input.area_code && item.name === "Special Geographic Area");
    if (!independent && !administrativeArea) return { error: "The selected geographic area does not belong to the selected region." };
  }

  if (region.code !== "1300000000" && !province && !independent && !administrativeArea && !String(input.custom_province || "").trim()) {
    return { error: "Select a province or independent city for this region." };
  }
  if (region.code === "1300000000" && province) return { error: "NCR does not have provinces." };

  const customProvince = String(input.custom_province || "").trim();
  if (region.code === "1300000000" && (customProvince || input.custom_province_selected)) {
    return { error: "NCR does not have provinces or custom province entries." };
  }
  if (input.custom_province_selected && !customProvince) return { error: "Enter the unlisted province or area name." };
  const customCity = String(input.custom_city || "").trim();
  const customBarangay = String(input.custom_barangay || "").trim();
  if (input.custom_city_selected && !customCity) return { error: "Enter the unlisted city or municipality name." };
  if (input.custom_barangay_selected && !customBarangay) return { error: "Enter the unlisted barangay name." };
  const cityCode = input.city_code ? String(input.city_code) : "";
  const cityName = String(input.city_name || "").trim();
  if (!cityCode && !customCity) return { error: "City or municipality is required." };

  let area = null;
  if (province || independent || administrativeArea) {
    area = await loadPsgcArea(province?.code || independent?.code || administrativeArea.code);
    if (!area) return { error: "The selected PSGC location is unavailable." };
  }
  let city = null;
  if (cityCode) {
    city = area?.cities.find((item) => item.code === cityCode) || null;
    if (!city) return { error: "The selected city or municipality does not belong to the selected province or region." };
  }

  let barangay = null;
  const barangayCode = input.barangay_code ? String(input.barangay_code) : "";
  if (barangayCode) {
    if (!city) return { error: "A PSGC barangay requires a verified PSGC city or municipality." };
    const entry = city.barangays.find(([code]) => code === barangayCode);
    if (!entry) return { error: "The selected barangay does not belong to the selected city or municipality." };
    barangay = { code: entry[0], name: entry[1] };
  } else if (customBarangay && !city && !customCity) {
    return { error: "A custom barangay requires a city or municipality." };
  }

  const provinceName = province?.name || customProvince || null;
  const geographicAreaName = administrativeArea?.name || null;
  const cityDisplayName = city?.name || customCity || cityName;
  const barangayName = barangay?.name || customBarangay || null;
  const verified = Boolean(region && city && !customProvince && !customCity && !customBarangay);
  const parts = [barangayName, cityDisplayName, provinceName, geographicAreaName, region.name, String(input.specific || "").trim()].filter(Boolean);
  return {
    value: {
      region_code: region.code,
      region_name: region.name,
      province_code: province?.code || null,
      province_name: provinceName,
      area_code: province?.code || independent?.code || administrativeArea?.code || null,
      area_name: geographicAreaName,
      scope_type: administrativeArea ? "administrative_area" : province ? "province" : independent ? "independent" : customProvince ? "custom" : "",
      city_code: city?.code || null,
      city_name: cityDisplayName,
      barangay_code: barangay?.code || null,
      barangay_name: barangayName,
      custom_province_selected: Boolean(input.custom_province_selected),
      custom_city_selected: Boolean(input.custom_city_selected),
      custom_barangay_selected: Boolean(input.custom_barangay_selected),
      specific: String(input.specific || "").trim(),
      verified,
    },
    display: parts.join(", ").slice(0, 255),
    verified,
  };
}
