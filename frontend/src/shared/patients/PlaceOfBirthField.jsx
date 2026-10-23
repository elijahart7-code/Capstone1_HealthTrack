import { useEffect, useState } from "react";
import { Field, Input, Select } from "../../components/ui/Input";

const DATA_URL = "/data/psgc";
const OTHER = "__other__";

function SearchableSelect({ label, value, options, onChange, disabled, loading, required, placeholder, includeOther = false }) {
  return (
    <div className="ht-field">
      <span>
        {label}
        {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
      </span>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || loading}
        required={required}
        aria-label={label}
      >
        <option value="">{loading ? "Loading locations…" : placeholder}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>{option.name}</option>
        ))}
        {includeOther && <option value={OTHER}>Other / Specify (not PSGC verified)</option>}
      </Select>
      {loading && <span className="ht-location-loading" role="status">Loading geographic data…</span>}
    </div>
  );
}

/** PSGC-backed birthplace cascade. Codes remain strings to retain leading zeroes. */
export function PlaceOfBirthField({ value = null, onChange, required = false }) {
  const [regions, setRegions] = useState([]);
  const [selection, setSelection] = useState({
    regionCode: "",
    scopeCode: "",
    scopeKind: "",
    cityCode: "",
    barangayCode: "",
    customProvince: "",
    customCity: "",
    customCityActive: false,
    customBarangay: "",
    customBarangayActive: false,
    specific: "",
  });
  const [area, setArea] = useState(null);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingArea, setLoadingArea] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${DATA_URL}/index.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the Philippine geographic list.");
        return response.json();
      })
      .then((data) => {
        if (active) setRegions(data.regions || []);
      })
      .catch((error) => active && setDataError(error.message))
      .finally(() => active && setLoadingRegions(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selection.scopeCode) {
      setArea(null);
      setLoadingArea(false);
      return undefined;
    }
    setLoadingArea(true);
    setDataError("");
    fetch(`${DATA_URL}/areas/${selection.scopeCode}.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load locations for this selection.");
        return response.json();
      })
      .then((data) => active && setArea(data))
      .catch((error) => active && setDataError(error.message))
      .finally(() => active && setLoadingArea(false));
    return () => { active = false; };
  }, [selection.scopeCode]);

  useEffect(() => {
    if (!value) return;
    setSelection({
      regionCode: value.region_code || "",
      scopeCode: value.area_code || value.province_code || "",
      scopeKind: value.custom_province_selected || value.custom_province ? "custom" : value.scope_type || (value.province_code ? "province" : value.area_code ? "independent" : ""),
      cityCode: value.city_code || "",
      barangayCode: value.barangay_code || "",
      customProvince: value.custom_province || "",
      customCity: value.custom_city || "",
      customCityActive: Boolean(value.custom_city_selected || value.custom_city),
      customBarangay: value.custom_barangay || "",
      customBarangayActive: Boolean(value.custom_barangay_selected || value.custom_barangay),
      specific: value.specific || "",
    });
  }, [value]);

  const region = regions.find((item) => item.code === selection.regionCode);
  const isNcr = selection.regionCode === "1300000000";
  const scopes = region
    ? [
        ...(region.provinces || []).map((item) => ({ ...item, kind: item.name === "Special Geographic Area" ? "administrative_area" : "province" })),
        ...(region.independent || []).map((item) => ({ ...item, kind: "independent" })),
      ]
    : [];
  const cities = area?.cities || [];
  const selectedCity = cities.find((item) => item.code === selection.cityCode);
  const barangays = (selectedCity?.barangays || []).map(([code, name]) => ({ code, name }));
  const emptyCustomCity = selection.scopeKind === "custom";

  function notify(nextSelection) {
    setSelection(nextSelection);
    const nextRegion = regions.find((item) => item.code === nextSelection.regionCode);
    const nextScope = scopes.find((item) => item.code === nextSelection.scopeCode);
    const nextArea = area?.code === nextSelection.scopeCode ? area : null;
    const nextCities = nextRegion?.code === "1300000000"
      ? (nextRegion.independent || [])
      : nextArea?.cities || [];
    const nextCity = nextCities.find((item) => item.code === nextSelection.cityCode);
    const nextBarangay = nextCity?.barangays?.find(([code]) => code === nextSelection.barangayCode);
    const custom = Boolean(
      nextSelection.customProvince || nextSelection.customCity || nextSelection.customBarangay ||
      nextSelection.scopeKind === "custom" || nextSelection.customCityActive || nextSelection.customBarangayActive
    );
    onChange?.({
      region_code: nextSelection.regionCode || null,
      region_name: nextRegion?.name || "",
      province_code: nextScope?.kind === "province" ? nextScope.code : null,
      province_name: nextScope?.kind === "province" ? nextScope.name : (nextSelection.customProvince || null),
      area_code: nextSelection.scopeCode || null,
      area_name: nextScope?.kind === "administrative_area" ? nextScope.name : null,
      scope_type: nextScope?.kind || nextSelection.scopeKind || "",
      city_code: nextCity?.code || null,
      city_name: nextCity?.name || nextSelection.customCity || "",
      barangay_code: nextBarangay?.[0] || null,
      barangay_name: nextBarangay?.[1] || nextSelection.customBarangay || null,
      specific: nextSelection.specific || "",
      verified: !custom && Boolean(nextRegion && nextCity),
      custom_province: nextSelection.customProvince || "",
      custom_city: nextSelection.customCity || "",
      custom_barangay: nextSelection.customBarangay || "",
      custom_province_selected: nextSelection.scopeKind === "custom",
      custom_city_selected: Boolean(nextSelection.customCityActive),
      custom_barangay_selected: Boolean(nextSelection.customBarangayActive),
    });
  }

  function changeRegion(regionCode) {
    notify({
      regionCode,
      scopeCode: "",
      scopeKind: "",
      cityCode: "",
      barangayCode: "",
      customProvince: "",
      customCity: "",
      customCityActive: false,
      customBarangay: "",
      customBarangayActive: false,
      specific: selection.specific,
    });
  }

  function changeScope(scopeCode) {
    if (scopeCode === OTHER) {
      notify({ ...selection, scopeCode: "", scopeKind: "custom", cityCode: "", barangayCode: "", customProvince: "", customCity: "", customCityActive: false, customBarangay: "", customBarangayActive: false });
      return;
    }
    const selected = scopes.find((item) => item.code === scopeCode);
    notify({ ...selection, scopeCode, scopeKind: selected?.kind || "", cityCode: "", barangayCode: "", customProvince: "", customCity: "", customCityActive: false, customBarangay: "", customBarangayActive: false });
  }

  function changeCity(cityCode) {
    if (cityCode === OTHER) {
      notify({ ...selection, cityCode: "", barangayCode: "", customCity: "", customCityActive: true, customBarangay: "", customBarangayActive: false });
      return;
    }
    const directCity = isNcr ? region?.independent?.find((item) => item.code === cityCode) : null;
    if (directCity) {
      notify({ ...selection, scopeCode: directCity.code, scopeKind: "independent", cityCode, barangayCode: "", customCity: "", customCityActive: false, customBarangay: "", customBarangayActive: false });
    } else {
      notify({ ...selection, cityCode, barangayCode: "", customCity: "", customCityActive: false, customBarangay: "", customBarangayActive: false });
    }
  }

  const hasCity = Boolean(selection.cityCode || selection.customCity.trim());
  const cityRequired = required;
  const scopeOptions = scopes.map(({ code, name, kind }) => ({
    code,
    name: kind === "independent" ? `${name} (independent city; no province)` : name,
  }));
  const cityOptions = (isNcr ? (region?.independent || []) : cities).map(({ code, name, type }) => ({
    code,
    name: `${name}${type === "municipality" ? " (municipality)" : ""}`,
  }));

  return (
    <div className="ht-place-of-birth">
      {dataError && <div className="ht-login-alert ht-login-alert-error" role="alert">{dataError}</div>}
      <div className="ht-place-of-birth-grid">
        <SearchableSelect
          label="Region"
          value={selection.regionCode}
          options={regions}
          onChange={changeRegion}
          disabled={false}
          loading={loadingRegions}
          required={required}
          placeholder="Select a region"
        />

        {!isNcr && (
          <SearchableSelect
            label="Province / Administrative Area / Independent City"
            value={selection.scopeCode || (selection.scopeKind === "custom" ? OTHER : "")}
            options={scopeOptions}
            onChange={changeScope}
            disabled={!region}
            loading={false}
            required={required}
            placeholder="Select a province, administrative area, or independent city"
            includeOther
          />
        )}

        {isNcr ? (
          <SearchableSelect
            label="City / Municipality"
            value={selection.cityCode}
            options={cityOptions}
            onChange={changeCity}
            disabled={!region}
            loading={false}
            required={cityRequired && !selection.customCityActive}
            placeholder="Select a city or municipality"
            includeOther
          />
        ) : (
          <SearchableSelect
            label="City / Municipality"
            value={selection.cityCode || (selection.customCityActive ? OTHER : "")}
            options={emptyCustomCity ? [] : cityOptions}
            onChange={changeCity}
            disabled={!selection.scopeCode && selection.scopeKind !== "custom"}
            loading={loadingArea}
            required={cityRequired && !selection.customCityActive}
            placeholder="Select a city or municipality"
            includeOther
          />
        )}

        {selection.scopeKind === "custom" && !isNcr && (
          <Field label="Other province / area" required={required}>
            <Input required={required} value={selection.customProvince} onChange={(event) => notify({ ...selection, customProvince: event.target.value, customCity: "", customCityActive: false, barangayCode: "", customBarangay: "", customBarangayActive: false })} placeholder="Enter an unlisted province or area" />
          </Field>
        )}

        {selection.customCityActive && (
          <Field label="Other city / municipality" required={cityRequired}>
            <Input required={cityRequired} value={selection.customCity} onChange={(event) => notify({ ...selection, customCity: event.target.value, barangayCode: "", customBarangay: "", customBarangayActive: false })} placeholder="Enter an unlisted city or municipality" />
          </Field>
        )}

        {hasCity && (
          <>
            <SearchableSelect
              label="Barangay (Optional)"
              value={selection.barangayCode || (selection.customBarangayActive ? OTHER : "")}
              options={barangays}
              onChange={(code) => {
                if (code === OTHER) notify({ ...selection, barangayCode: "", customBarangay: "", customBarangayActive: true });
                else notify({ ...selection, barangayCode: code, customBarangay: "", customBarangayActive: false });
              }}
              disabled={!selectedCity && !(selection.customCityActive && selection.customCity.trim())}
              loading={loadingArea}
              placeholder="Select a barangay (optional)"
              includeOther
            />
            {selection.customBarangayActive && (
              <Field label="Other barangay" >
                <Input value={selection.customBarangay} onChange={(event) => notify({ ...selection, customBarangay: event.target.value })} placeholder="Enter an unlisted barangay" />
              </Field>
            )}
          </>
        )}

      </div>
    </div>
  );
}
