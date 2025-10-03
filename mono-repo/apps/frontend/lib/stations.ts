export type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};
export const KOCHI_STATIONS: Station[] = [
  { id: "ALU", name: "Aluva",            lat: 10.1096,      lng: 76.3516 },
  { id: "PUL", name: "Pulinchodu",        lat: 10.0977,      lng: 76.3371 },
  { id: "COM", name: "Companypady",       lat: 10.087293,    lng: 76.342840 }, // [web:8]
  { id: "AMB", name: "Ambattukavu",       lat: 10.079372,    lng: 76.339004 }, // [web:8]
  { id: "MUT", name: "Muttom",            lat: 10.072575,    lng: 76.333727 }, // [web:10]
  { id: "KAL", name: "Kalamassery",       lat: 10.058400,    lng: 76.321926 }, // [web:8]
  { id: "CUS", name: "CUSAT",             lat: 10.046879,    lng: 76.318377 },
  { id: "PAT", name: "Pathadipalam",      lat: 10.035948,    lng: 76.314371 }, // [web:28]
  { id: "EDP", name: "Edapally",          lat: 10.025491,    lng: 76.307993 },
  { id: "CHP", name: "Changampuzha Park", lat: 10.015178,    lng: 76.302294 }, // [web:8]
  { id: "PAL", name: "Palarivattom",      lat: 10.008964,    lng: 76.30385  }, // [web:8]
  { id: "JLN", name: "JLN Stadium",       lat: 10.000554,    lng: 76.299535 }, // [web:39][web:43]
  { id: "KAL2", name: "Kaloor",           lat: 9.994484,     lng: 76.291669 }, // [web:49]
  { id: "THL", name: "Town Hall",         lat: 9.991222,     lng: 76.288028 }, // [web:48]
  { id: "MGR", name: "M.G. Road",         lat: 9.983395,     lng: 76.282351 }, // [web:62]
  { id: "MCG", name: "Maharaja’s College",lat: 9.973488,     lng: 76.285015 }, // [web:63]
  { id: "ERS", name: "Ernakulam South",   lat: 9.968620,     lng: 76.291278 }, // [web:67]
  { id: "KAV", name: "Kadavanthra",      lat: 9.966547,     lng: 76.298185 }, // [web:75]
  { id: "ELA", name: "Elamkulam",         lat: 9.967170,     lng: 76.308870 },
  { id: "VYT", name: "Vyttila",           lat: 9.967498,     lng: 76.320409 },
  { id: "THK", name: "Thaikoodam",        lat: 9.959964,     lng: 76.323708 }, // [web:87]
  { id: "PET", name: "Petta",             lat: 9.952350,     lng: 76.330070 }, // [web:82]
  { id: "VAK", name: "Vadakkekotta",      lat: 9.953440,     lng: 76.331010 },       // (No reliable public data was found)
  { id: "SNJ", name: "SN Junction",       lat: 9.949775,     lng: 76.354494 },       // (No reliable public data was found)
  { id: "TRP", name: "Thrippunithura Terminal", lat: 9.950570, lng: 76.351720 },
];
