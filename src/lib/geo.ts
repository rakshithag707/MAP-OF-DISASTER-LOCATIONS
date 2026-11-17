import { REGIONS, type RegionLabel } from "./hazards";

const COUNTRY_NAMES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas",
  "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon",
  "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan",
  "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives",
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Puerto Rico", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const COUNTRY_ALIASES: Record<string, string> = {
  "usa": "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "us": "United States",
  "united states of america": "United States",
  "america": "United States",
  "uk": "United Kingdom",
  "great britain": "United Kingdom",
  "england": "United Kingdom",
  "scotland": "United Kingdom",
  "wales": "United Kingdom",
  "northern ireland": "United Kingdom",
  "uae": "United Arab Emirates",
  "czech republic": "Czechia",
  "south korea": "South Korea",
  "korea": "South Korea",
  "north korea": "North Korea",
  "russian federation": "Russia",
  "russia": "Russia",
  "turkiye": "Turkey",
  "türkiye": "Turkey",
  "burma": "Myanmar",
  "ivory coast": "Ivory Coast",
  "côte d’ivoire": "Ivory Coast",
  "cote d'ivoire": "Ivory Coast",
  "cape verde": "Cabo Verde",
  "east timor": "Timor-Leste",
  "vatican": "Vatican City",
  "solomon is.": "Solomon Islands",
  "solomon is": "Solomon Islands",
  "micronesia fed. sts.": "Micronesia",
  "fiji islands": "Fiji",
  "philippine islands": "Philippines",
  "hawaiian islands": "United States",
  "aleutian islands": "United States",
  "south georgia and south sandwich islands": "South Georgia",
  "south sandwich islands": "South Georgia",
  "french polynesia": "French Polynesia",
  "new caledonia": "New Caledonia",
  "puerto rico": "United States",
  "u.s. virgin islands": "United States",
  "virgin islands": "United States",
  "guam": "Guam",
  "american samoa": "United States",
  "northern mariana islands": "United States",
  "svalbard": "Norway",
  "greenland": "Denmark",
  "hong kong": "Hong Kong",
  "macau": "Macau",
  "kashmir": "India",
  "west bank": "Palestine",
  "gaza": "Palestine",
  "kosovo": "Kosovo",
  "faroe islands": "Denmark",
  "cayman islands": "Cayman Islands",
  "bermuda": "Bermuda",
  "aruba": "Aruba",
  "curaçao": "Curaçao",
  "curacao": "Curaçao",
  "reunion": "France",
  "réunion": "France",
  "mayotte": "France",
  "martinique": "France",
  "guadeloupe": "France",
  "french guiana": "France",
  "azores": "Portugal",
  "canary islands": "Spain",
  "balearic islands": "Spain",
  "sardinia": "Italy",
  "sicily": "Italy",
  "crete": "Greece",
  "cyprus": "Cyprus",
  "socotra": "Yemen",
};

const US_STATES = new Set([
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
  "CA", "AK", "AZ", "AR", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI",
  "WY",
]);

const COUNTRY_SET = new Set(COUNTRY_NAMES.map((name) => name.toLowerCase()));
const SORTED_ALIASES = Object.entries(COUNTRY_ALIASES).sort(
  (a, b) => b[0].length - a[0].length,
);
const SORTED_COUNTRIES = [...COUNTRY_NAMES].sort((a, b) => b.length - a.length);

function cleanLocationSegment(segment: string): string {
  return segment
    .replace(/\([^)]*\)/g, " ")
    .replace(
      /^(south|north|east|west|northeast|northwest|southeast|southwest) of (the )?/i,
      "",
    )
    .replace(/^near (the )?/i, "")
    .replace(/^off (the )?(coast of )?/i, "")
    .replace(/\s+region$/i, "")
    .replace(/\s+region of$/i, "")
    .replace(/\s+islands?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalCountry(candidate: string): string | undefined {
  const cleaned = candidate.replace(/\.$/, "").trim();
  const lower = cleaned.toLowerCase();
  if (!lower) return undefined;
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
  if (US_STATES.has(cleaned)) return "United States";
  if (
    /(alaska|aleutian|hawaii|california|puerto rico|virgin islands|mariana|guam|samoa)/i.test(
      cleaned,
    )
  ) {
    return "United States";
  }
  if (COUNTRY_SET.has(lower)) {
    return COUNTRY_NAMES.find((name) => name.toLowerCase() === lower);
  }
  for (const [alias, country] of SORTED_ALIASES) {
    if (lower === alias || lower.includes(alias)) return country;
  }
  for (const country of SORTED_COUNTRIES) {
    if (lower.includes(country.toLowerCase())) return country;
  }
  return undefined;
}

export function countryFromPlace(place?: string | null): string {
  if (!place) return "Unassigned";
  const segments = place
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = cleanLocationSegment(segments[index]);
    const match = canonicalCountry(segment);
    if (match) return match;
    if (index === segments.length - 1) {
      // Common informal ocean/region labels that have a sovereign association.
      if (/okhotsk|kamchatka|kuril/i.test(segment)) return "Russia";
      if (/fiji/i.test(segment)) return "Fiji";
      if (/tonga/i.test(segment)) return "Tonga";
      if (/marianas?/i.test(segment)) return "United States";
      if (/aleutian/i.test(segment)) return "United States";
    }
  }
  return "Unassigned";
}

export function normalizeCountry(country?: string | null): string {
  if (!country) return "Unassigned";
  const direct = canonicalCountry(country.trim());
  return direct ?? country.trim();
}

const COUNTRY_REGION_OVERRIDES: Record<string, RegionLabel> = {
  // Pacific island states and territories are grouped with Oceania even when
  // their longitudes cross the international date line.
  "Australia": "Oceania",
  "New Zealand": "Oceania",
  "Fiji": "Oceania",
  "Vanuatu": "Oceania",
  "Solomon Islands": "Oceania",
  "Papua New Guinea": "Oceania",
  "Tonga": "Oceania",
  "Samoa": "Oceania",
  "Kiribati": "Oceania",
  "Micronesia": "Oceania",
  "Marshall Islands": "Oceania",
  "Palau": "Oceania",
  "Nauru": "Oceania",
  "Tuvalu": "Oceania",
  "Cook Islands": "Oceania",
  "French Polynesia": "Oceania",
  "New Caledonia": "Oceania",
  "Guam": "Oceania",
  "Northern Mariana Islands": "Oceania",
  "American Samoa": "Oceania",
  "Wallis and Futuna": "Oceania",
  "Niue": "Oceania",
  "Tokelau": "Oceania",
  "Pitcairn Islands": "Oceania",
  "Norfolk Island": "Oceania",
};

export function regionFromCoordinates(
  lat: number,
  lon: number,
  country?: string,
): RegionLabel {
  if (country && COUNTRY_REGION_OVERRIDES[country]) {
    return COUNTRY_REGION_OVERRIDES[country];
  }

  // Ordered from most specific to broadest.
  if (lat >= 33 && lat <= 72 && lon >= -25 && lon <= 45) {
    if (lat <= 38 && lon >= 27) return "Middle East";
    return "Europe";
  }
  if (lat >= 10 && lat <= 45 && lon >= 34 && lon <= 65) return "Middle East";
  if (lon >= 110 && lat < -8 && lat > -55) return "Oceania";
  if (lon >= -25 && lon <= 55 && lat >= -40 && lat <= 37) return "Africa";
  if (lon >= 25 && lon <= 180 && lat >= -12 && lat <= 82) return "Asia-Pacific";
  if (lon >= -170 && lon <= -25 && lat >= -60 && lat <= 80) return "Americas";
  // South Pacific points east of the date line.
  if ((lon <= -140 || lon >= 170) && lat < -8 && lat > -55) return "Oceania";
  return "Remote / Oceanic";
}

export function regionColor(region: string): string {
  return REGIONS.find((item) => item.label === region)?.color ?? "#64748b";
}

export function regionDescription(region: string): string {
  return REGIONS.find((item) => item.label === region)?.description ?? "";
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
