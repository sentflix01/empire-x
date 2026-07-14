/**
 * seed.js — Real Addis Ababa businesses + 50 Ethiopian users
 *
 * Run: node db/seed.js
 *
 * Creates:
 *   50 users with Ethiopian names and profiles
 *   150 real Addis Ababa businesses (3 per user) with coordinates
 *   Posts, products, tasks, orders, reviews, messages, etc.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const pool = require('./pool');
const { buildBusinessSections, buildShowroomData, PRICE_RANGE, VERIFIED_BUSINESSES } = require('./templateData');

const TEST_PASSWORD = 'Test1234!';
const ADMIN_PASSWORD = 'Admin1234!';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }
// Add small jitter to coordinates so pins don't overlap
function jitter(lat, lon, km = 0.5) {
  const d = km / 111;
  return {
    lat: lat + (Math.random() - 0.5) * d,
    lon: lon + (Math.random() - 0.5) * d,
  };
}

// ── Ethiopian names for realistic users ────────────────────────────────────
const ETHIOPIAN_NAMES = [
  ['Abebe','Girma'],['Tigist','Haile'],['Dawit','Bekele'],['Mekdes','Tadesse'],
  ['Yonas','Alemu'],['Hiwot','Mekonnen'],['Selam','Assefa'],['Biruk','Getachew'],
  ['Rahel','Wolde'],['Kaleb','Desta'],['Eyerusalem','Tesfaye'],['Natnael','Hailu'],
  ['Meron','Kebede'],['Fitsum','Negash'],['Bethlehem','Girma'],['Solomon','Bekele'],
  ['Lidya','Abebe'],['Mikias','Hailu'],['Selamawit','Alemu'],['Henok','Tadesse'],
  ['Aziz','Mohammed'],['Kalkidan','Tesfaye'],['Yordanos','Getahun'],['Robel','Wondimu'],
  ['Tinsae','Legesse'],['Abrham','Mulugeta'],['Hana','Tadesse'],['Bezawit','Assefa'],
  ['Yisak','Berhe'],['Lemlem','Gebre'],['Kibrom','Haileselassie'],['Meklit','Wudu'],
  ['Fikadu','Demeke'],['Tigist','Gebre'],['Naol','Gadissa'],['Liya','Bekele'],
  ['Binyam','Haile'],['Sosina','Tesfaye'],['Elias','Girma'],['Winta','Gebre'],
  ['Seid','Mohammed'],['Helina','Bekele'],['Natan','Girma'],['Adanech','Abebe'],
  ['Kirubel','Alemu'],['Yemi','Tadesse'],['Fasika','Bekele'],['Haben','Haile'],
  ['Ermias','Gebre'],['Tsegay','Berhe'],
];

const ADDIS_DISTRICTS = [
  'Bole','Kirkos','Yeka','Arada','Lideta','Nifas Silk-Lafto',
  'Kolfe Keranio','Gullele','Akaki Kaliti','Lemi Kura',
];

// ── 150 real Addis Ababa businesses with coordinates ──────────────────────
// lat/lon are approximate known locations. Category maps to our DB enum.
const BUSINESSES = [
  // ── Major Companies & State Enterprises (1-20) ──
  { name:'Ethiopian Airlines', cat:'service', lat:8.9778, lon:38.7989, district:'Bole', desc:'Flag carrier airline of Ethiopia, one of Africa\'s largest airlines. Bole International Airport.' },
  { name:'Ethio Telecom', cat:'service', lat:9.0190, lon:38.7525, district:'Arada', desc:'National telecommunications provider offering mobile, internet and landline services.' },
  { name:'Commercial Bank of Ethiopia', cat:'other', lat:9.0227, lon:38.7468, district:'Kirkos', desc:'Largest commercial bank in Ethiopia, headquartered near Meskel Square.' },
  { name:'Ethiopian Electric Power', cat:'service', lat:9.0050, lon:38.7610, district:'Nifas Silk-Lafto', desc:'State-owned electric utility managing generation, transmission and distribution.' },
  { name:'BGI Ethiopia PLC', cat:'other', lat:8.9960, lon:38.7820, district:'Akaki Kaliti', desc:'Brewery producing St. George and Castel beer brands.' },
  { name:'Dashen Bank SC', cat:'other', lat:9.0268, lon:38.7527, district:'Arada', desc:'One of Ethiopia\'s leading private commercial banks.' },
  { name:'Awash International Bank', cat:'other', lat:9.0180, lon:38.7490, district:'Kirkos', desc:'Pioneer private commercial bank in Ethiopia, founded 1994.' },
  { name:'MIDROC Ethiopia', cat:'other', lat:9.0130, lon:38.7620, district:'Nifas Silk-Lafto', desc:'Large conglomerate with investments in mining, construction and industry.' },
  { name:'Ethiopian Sugar Corporation', cat:'other', lat:9.0350, lon:38.7380, district:'Gullele', desc:'State enterprise managing Ethiopia\'s sugar production and distribution.' },
  { name:'Anbessa City Bus Service Enterprise', cat:'service', lat:9.0140, lon:38.7610, district:'Kirkos', desc:'Public city bus enterprise serving Addis Ababa metropolitan area.' },
  { name:'National Bank of Ethiopia', cat:'other', lat:9.0260, lon:38.7500, district:'Arada', desc:'Central bank of Ethiopia, regulating financial institutions.' },
  { name:'Oromia International Bank', cat:'other', lat:9.0200, lon:38.7550, district:'Kirkos', desc:'Shareholder-owned commercial bank with strong regional presence.' },
  { name:'Cooperative Bank of Oromia', cat:'other', lat:9.0170, lon:38.7530, district:'Kirkos', desc:'Cooperative-model bank serving farmers and SMEs.' },
  { name:'Nib International Bank', cat:'other', lat:9.0240, lon:38.7490, district:'Arada', desc:'Private commercial bank offering retail and corporate banking.' },
  { name:'Abay Bank', cat:'other', lat:9.0300, lon:38.7540, district:'Arada', desc:'Private bank named after the Blue Nile river.' },
  { name:'Addis International Bank', cat:'other', lat:9.0280, lon:38.7510, district:'Kirkos', desc:'Commercial bank serving retail and business customers.' },
  { name:'Berhan International Bank', cat:'other', lat:9.0220, lon:38.7470, district:'Arada', desc:'Shareholder-based commercial bank with nationwide branches.' },
  { name:'Bunna International Bank', cat:'other', lat:9.0210, lon:38.7480, district:'Kirkos', desc:'Private commercial bank, Bunna means coffee in Amharic.' },
  { name:'Wegagen Bank', cat:'other', lat:9.0250, lon:38.7520, district:'Arada', desc:'One of the oldest private banks in Ethiopia.' },
  { name:'Bank of Abyssinia', cat:'other', lat:9.0290, lon:38.7490, district:'Arada', desc:'Leading private commercial bank with over 400 branches.' },
  // ── Hotels (21-50) ──
  { name:'Sheraton Addis', cat:'restaurant', lat:9.0127, lon:38.7631, district:'Kirkos', desc:'5-star luxury hotel on Taitu Street, one of Africa\'s finest hotels.' },
  { name:'Hilton Addis Ababa', cat:'restaurant', lat:9.0220, lon:38.7543, district:'Kirkos', desc:'Iconic 5-star hotel near the AU headquarters.' },
  { name:'Hyatt Regency Addis Ababa', cat:'restaurant', lat:9.0320, lon:38.7450, district:'Gullele', desc:'Modern 5-star hotel with panoramic city views.' },
  { name:'Haile Grand Addis Ababa', cat:'restaurant', lat:8.9950, lon:38.8050, district:'Bole', desc:'Premium hotel owned by Olympic legend Haile Gebreselassie.' },
  { name:'Radisson Blu Hotel Addis Ababa', cat:'restaurant', lat:9.0160, lon:38.7640, district:'Kirkos', desc:'International 5-star hotel near the AU compound.' },
  { name:'Capital Hotel and Spa', cat:'restaurant', lat:9.0060, lon:38.7920, district:'Bole', desc:'Upscale hotel with full-service spa, Bole area.' },
  { name:'Elily International Hotel', cat:'restaurant', lat:9.0080, lon:38.7900, district:'Bole', desc:'Modern hotel on Bole Road with conference facilities.' },
  { name:'Golden Tulip Hotel', cat:'restaurant', lat:9.0100, lon:38.7850, district:'Bole', desc:'International chain hotel, business class accommodation.' },
  { name:'Best Western Plus Pearl Addis', cat:'restaurant', lat:9.0040, lon:38.7960, district:'Bole', desc:'Business hotel near Bole International Airport.' },
  { name:'Friendship International Hotel', cat:'restaurant', lat:9.0000, lon:38.7880, district:'Bole', desc:'Mid-range hotel popular with business travelers.' },
  { name:'Bole Ambassador Hotel', cat:'restaurant', lat:9.0050, lon:38.7910, district:'Bole', desc:'Comfortable hotel near the airport district.' },
  { name:'Harmony Hotel', cat:'restaurant', lat:9.0110, lon:38.7840, district:'Bole', desc:'Boutique hotel with garden restaurant and bar.' },
  { name:'Dreamliner Hotel', cat:'restaurant', lat:9.0090, lon:38.7870, district:'Bole', desc:'Named after Boeing 787, near Ethiopian Airlines hub.' },
  { name:'Adot Tina Hotel', cat:'restaurant', lat:9.0150, lon:38.7720, district:'Kirkos', desc:'Local hotel known for traditional Ethiopian hospitality.' },
  { name:'Azzeman Hotel', cat:'restaurant', lat:9.0180, lon:38.7660, district:'Kirkos', desc:'Traditional-style hotel with Ethiopian decor and cuisine.' },
  { name:'Abyssinia Renaissance Hotel', cat:'restaurant', lat:9.0200, lon:38.7600, district:'Kirkos', desc:'Heritage-themed hotel in the heart of the city.' },
  { name:'Addissinia Hotel', cat:'restaurant', lat:9.0050, lon:38.7800, district:'Nifas Silk-Lafto', desc:'Comfortable hotel with rooftop restaurant.' },
  { name:'Ramada by Wyndham Addis', cat:'restaurant', lat:9.0140, lon:38.7700, district:'Kirkos', desc:'International brand hotel with modern amenities.' },
  { name:'Intercontinental Hotel Addis Ababa', cat:'restaurant', lat:9.0120, lon:38.7580, district:'Kirkos', desc:'Heritage IHG property, landmark of Addis Ababa.' },
  { name:'Crescent International Hotel', cat:'restaurant', lat:9.0260, lon:38.7420, district:'Gullele', desc:'Hotel and conference center in northern Addis Ababa.' },
  { name:'Point Central Hotel', cat:'restaurant', lat:9.0230, lon:38.7460, district:'Arada', desc:'Centrally located hotel with business services.' },
  { name:'Debredamo Hotel', cat:'restaurant', lat:9.0330, lon:38.7380, district:'Gullele', desc:'Budget-friendly hotel in Piassa area.' },
  { name:'Churchill Hotel', cat:'restaurant', lat:9.0270, lon:38.7440, district:'Arada', desc:'Classic hotel on Churchill Avenue, Addis Ababa.' },
  { name:'Saro-Maria Hotel', cat:'restaurant', lat:9.0310, lon:38.7400, district:'Arada', desc:'Family-run hotel with traditional coffee ceremony.' },
  { name:'Ag Palace Hotel', cat:'restaurant', lat:9.0290, lon:38.7410, district:'Gullele', desc:'Palace-style hotel with event facilities.' },
  { name:'Aphrodite International Hotel', cat:'restaurant', lat:8.9980, lon:38.8020, district:'Bole', desc:'International hotel near the airport.' },
  { name:'Archi Hotel-Apartment', cat:'restaurant', lat:9.0020, lon:38.7980, district:'Bole', desc:'Serviced apartments and hotel rooms for long stays.' },
  { name:'Bellevue Hotel', cat:'restaurant', lat:9.0070, lon:38.7930, district:'Bole', desc:'Mid-range hotel with pool and restaurant.' },
  { name:'Global Hotel', cat:'restaurant', lat:9.0350, lon:38.7360, district:'Gullele', desc:'Affordable hotel popular with domestic travelers.' },
  { name:'Central Shoa Hotel', cat:'restaurant', lat:9.0380, lon:38.7340, district:'Gullele', desc:'Long-established hotel in Shola area.' },
  // ── Restaurants & Cafes (51-70) ──
  { name:'Yod Abyssinia Cultural Restaurant', cat:'restaurant', lat:9.0030, lon:38.7750, district:'Nifas Silk-Lafto', desc:'Famous cultural restaurant with traditional food and live music and dance.' },
  { name:'Kategna Restaurant', cat:'restaurant', lat:9.0060, lon:38.7810, district:'Bole', desc:'Popular Ethiopian restaurant known for injera and traditional dishes.' },
  { name:'Addis Ababa Restaurant', cat:'restaurant', lat:9.0240, lon:38.7460, district:'Arada', desc:'Classic restaurant serving traditional Ethiopian cuisine since 1960s.' },
  { name:'Marcus Addis Restaurant & Sky Bar', cat:'restaurant', lat:9.0000, lon:38.8000, district:'Bole', desc:'Rooftop restaurant with panoramic views of Addis Ababa.' },
  { name:'Totot Kitfo', cat:'restaurant', lat:9.0120, lon:38.7790, district:'Kirkos', desc:'Specialty kitfo (Ethiopian steak tartare) restaurant.' },
  { name:'Union Restaurant & Cocktail Bar', cat:'restaurant', lat:9.0150, lon:38.7750, district:'Kirkos', desc:'Trendy cocktail bar and restaurant popular with young professionals.' },
  { name:'Trattoria Gusto', cat:'restaurant', lat:9.0080, lon:38.7900, district:'Bole', desc:'Italian restaurant with authentic pasta and pizza.' },
  { name:'Tomoca Coffee', cat:'restaurant', lat:9.0300, lon:38.7430, district:'Arada', desc:'Iconic Ethiopian coffee shop established 1953 on De Gaulle Square.' },
  { name:'Yilma Restaurant', cat:'restaurant', lat:9.0210, lon:38.7570, district:'Kirkos', desc:'Traditional Ethiopian buffet restaurant with variety of injera dishes.' },
  { name:'Mesti Restaurant', cat:'restaurant', lat:9.0070, lon:38.7920, district:'Bole', desc:'Modern Ethiopian and international fusion cuisine.' },
  { name:'Sunbird Cafe', cat:'restaurant', lat:9.0190, lon:38.7620, district:'Kirkos', desc:'Relaxed cafe with Ethiopian coffee and light meals.' },
  { name:'African Jazz Village', cat:'restaurant', lat:9.0110, lon:38.7810, district:'Kirkos', desc:'Live jazz and African music venue with dinner service.' },
  { name:'KAZ Sushi', cat:'restaurant', lat:9.0040, lon:38.7960, district:'Bole', desc:'First Japanese sushi restaurant in Addis Ababa.' },
  { name:'Merkato Dining Spot', cat:'restaurant', lat:9.0340, lon:38.7300, district:'Addis Ketema', desc:'Popular local dining area within the Merkato district.' },
  { name:'Paresienne Cafe', cat:'restaurant', lat:9.0280, lon:38.7460, district:'Arada', desc:'French-style bakery and cafe near Piassa.' },
  { name:'Antica Restaurant', cat:'restaurant', lat:9.0130, lon:38.7780, district:'Kirkos', desc:'Italian-Ethiopian fusion restaurant with cozy atmosphere.' },
  { name:'La Mandoline', cat:'restaurant', lat:9.0090, lon:38.7890, district:'Bole', desc:'Fine dining French restaurant with wine list.' },
  { name:'Ristorante Castelli', cat:'restaurant', lat:9.0310, lon:38.7420, district:'Arada', desc:'Historic Italian restaurant open since 1948, a landmark eatery.' },
  { name:'Le Grand Rev', cat:'restaurant', lat:9.0250, lon:38.7480, district:'Arada', desc:'Upscale restaurant with European and Ethiopian menu.' },
  { name:'Yedesdes Restaurant', cat:'restaurant', lat:9.0170, lon:38.7680, district:'Kirkos', desc:'Local favorite for Ethiopian breakfast and lunch.' },
  // ── Shopping Malls (71-80) ──
  { name:'Dembel City Center', cat:'shop', lat:9.0163, lon:38.7521, district:'Kirkos', desc:'Large shopping mall with retail stores, cinema and food court near Meskel Square.' },
  { name:'Edna Mall', cat:'shop', lat:9.0081, lon:38.7875, district:'Bole', desc:'Major shopping and entertainment mall in Bole with cinema and supermarket.' },
  { name:'Century Mall', cat:'shop', lat:9.0048, lon:38.7943, district:'Bole', desc:'Modern mall near Bole Airport with fashion and electronics stores.' },
  { name:'Friendship City Center', cat:'shop', lat:9.0128, lon:38.7640, district:'Kirkos', desc:'Multi-story shopping center with local and international brands.' },
  { name:'Ambassador Shopping Mall', cat:'shop', lat:9.0145, lon:38.7712, district:'Kirkos', desc:'Popular mall with clothing, electronics and food options.' },
  { name:'Zefmesh Grand Mall', cat:'shop', lat:9.0195, lon:38.7563, district:'Nifas Silk-Lafto', desc:'Large shopping complex with supermarket and specialty stores.' },
  { name:'Town Square Mall', cat:'shop', lat:9.0220, lon:38.7491, district:'Kirkos', desc:'Boutique-style shopping mall with cafes and fashion.' },
  { name:'Lideta Market Mall', cat:'shop', lat:9.0070, lon:38.7600, district:'Lideta', desc:'Traditional market-style mall in Lideta district.' },
  { name:'Merkato Market', cat:'shop', lat:9.0350, lon:38.7290, district:'Addis Ketema', desc:'One of Africa\'s largest open-air markets with thousands of stalls.' },
  { name:'Shiro Meda Market', cat:'shop', lat:9.0580, lon:38.7610, district:'Gullele', desc:'Traditional textile market famous for habesha clothes.' },
  // ── Construction & Engineering (81-100) ──
  { name:'Sur Construction', cat:'service', lat:9.0050, lon:38.7650, district:'Nifas Silk-Lafto', desc:'Leading construction company with major infrastructure projects.' },
  { name:'Gemshu Beyene Construction (GEBECON)', cat:'service', lat:9.0150, lon:38.7580, district:'Kirkos', desc:'GEBECON, major Ethiopian building contractor.' },
  { name:'Tilahun Abebe General Contractor', cat:'service', lat:9.0180, lon:38.7620, district:'Kirkos', desc:'General contracting firm for residential and commercial buildings.' },
  { name:'Sunshine Construction', cat:'service', lat:9.0260, lon:38.7530, district:'Arada', desc:'Construction and real estate development company.' },
  { name:'Saba Engineering', cat:'service', lat:9.0100, lon:38.7820, district:'Bole', desc:'Engineering consultancy for infrastructure projects.' },
  { name:'AKGC Construction', cat:'service', lat:9.0070, lon:38.7840, district:'Bole', desc:'Construction firm specializing in commercial buildings.' },
  { name:'MIDROC Construction', cat:'service', lat:9.0130, lon:38.7760, district:'Kirkos', desc:'Construction arm of MIDROC conglomerate.' },
  { name:'EBRON Constructions', cat:'service', lat:9.0200, lon:38.7600, district:'Nifas Silk-Lafto', desc:'Mid-size construction company.' },
  { name:'Ezana Construction', cat:'service', lat:9.0170, lon:38.7640, district:'Kirkos', desc:'Building construction and renovation services.' },
  { name:'Walabu Construction', cat:'service', lat:9.0220, lon:38.7560, district:'Nifas Silk-Lafto', desc:'Construction contractor for government and private clients.' },
  { name:'Bencon Construction', cat:'service', lat:9.0250, lon:38.7510, district:'Arada', desc:'Specialized in reinforced concrete structures.' },
  { name:'Flintstone Engineering', cat:'service', lat:9.0080, lon:38.7900, district:'Bole', desc:'Electromechanical and civil engineering services.' },
  { name:'Ethiopian Construction Works Corporation', cat:'service', lat:9.0300, lon:38.7440, district:'Gullele', desc:'State enterprise for major public works.' },
  { name:'Haftom Leake Construction', cat:'service', lat:9.0140, lon:38.7730, district:'Kirkos', desc:'Residential and commercial construction contractor.' },
  { name:'Power Up Engineering PLC', cat:'service', lat:9.0090, lon:38.7880, district:'Bole', desc:'Electrical and power systems engineering.' },
  { name:'Spark Electromechanical Engineering', cat:'service', lat:9.0160, lon:38.7690, district:'Kirkos', desc:'Electromechanical installation and maintenance.' },
  { name:'Mark Electro Mechanical', cat:'service', lat:9.0210, lon:38.7570, district:'Kirkos', desc:'Electrical engineering and contracting services.' },
  { name:'Najaha Ahmed General Contractor', cat:'service', lat:9.0270, lon:38.7480, district:'Arada', desc:'General contracting for buildings and infrastructure.' },
  { name:'Mekonnen Getinet and Friends Building Construction', cat:'service', lat:9.0330, lon:38.7410, district:'Gullele', desc:'Family-owned construction company.' },
  { name:'Ethio-Engineering Group', cat:'service', lat:9.0380, lon:38.7360, district:'Kolfe Keranio', desc:'Engineering services company.' },
  // ── Manufacturing & Industry (101-120) ──
  { name:'Wagan Textile PLC', cat:'shop', lat:9.0400, lon:38.7350, district:'Kolfe Keranio', desc:'Textile manufacturer producing fabrics and garments.' },
  { name:'Falem Garment', cat:'shop', lat:8.9900, lon:38.7850, district:'Akaki Kaliti', desc:'Garment factory producing export-quality clothing.' },
  { name:'Maraki Gypsum Block', cat:'other', lat:9.0430, lon:38.7300, district:'Kolfe Keranio', desc:'Manufacturer of gypsum construction materials.' },
  { name:'Turufat Wood Works', cat:'shop', lat:9.0460, lon:38.7280, district:'Kolfe Keranio', desc:'Furniture and wood products manufacturer.' },
  { name:'Aberus Furniture', cat:'shop', lat:9.0050, lon:38.7650, district:'Nifas Silk-Lafto', desc:'Custom furniture manufacturer and retailer.' },
  { name:'Zeryihun Yilma Pipe and Sanitary', cat:'other', lat:9.0420, lon:38.7320, district:'Kolfe Keranio', desc:'Plumbing materials and sanitary ware supplier.' },
  { name:'Techno Fiber', cat:'other', lat:8.9870, lon:38.7900, district:'Akaki Kaliti', desc:'Fiber and textile processing plant.' },
  { name:'Avanti Pharmaceutical', cat:'health', lat:9.0200, lon:38.7620, district:'Kirkos', desc:'Pharmaceutical importer and distributor.' },
  { name:'Meltex Textile and Apparel', cat:'shop', lat:8.9920, lon:38.7870, district:'Akaki Kaliti', desc:'Apparel manufacturer for domestic and export markets.' },
  { name:'Harar Brewery', cat:'other', lat:9.0140, lon:38.7740, district:'Kirkos', desc:'Historic brewery with Addis Ababa distribution office.' },
  { name:'Marathon Motors Engineering', cat:'service', lat:9.0170, lon:38.7700, district:'Kirkos', desc:'Vehicle maintenance and engineering workshops.' },
  { name:'East Africa Bottling (Coca-Cola)', cat:'other', lat:8.9950, lon:38.7830, district:'Akaki Kaliti', desc:'Coca-Cola bottling plant serving East Africa.' },
  { name:'Heineken Breweries Ethiopia', cat:'other', lat:9.0000, lon:38.7810, district:'Nifas Silk-Lafto', desc:'Heineken brand brewery with Walia and Bedele beers.' },
  { name:'Derba Cement', cat:'other', lat:9.0350, lon:38.7410, district:'Gullele', desc:'Major cement manufacturer with Addis Ababa offices.' },
  { name:'Salini Impregilo (WeBuild)', cat:'service', lat:9.0100, lon:38.7860, district:'Bole', desc:'International construction giant with Ethiopian projects.' },
  { name:'Ethio Amron Trading PLC', cat:'shop', lat:9.0230, lon:38.7550, district:'Kirkos', desc:'Trading company for industrial goods.' },
  { name:'Zemen Natural Stone Art', cat:'shop', lat:9.0050, lon:38.7780, district:'Nifas Silk-Lafto', desc:'Natural stone and marble products.' },
  { name:'Wanchi Tour and Travel', cat:'other', lat:9.0070, lon:38.7930, district:'Bole', desc:'Tour operator and travel agency for Ethiopia.' },
  { name:'Daniel Tesfaye Transport', cat:'service', lat:9.0410, lon:38.7330, district:'Kolfe Keranio', desc:'Freight and logistics transport services.' },
  { name:'Belay Garage', cat:'service', lat:9.0380, lon:38.7380, district:'Kolfe Keranio', desc:'Full-service vehicle repair and maintenance garage.' },
  // ── IT, Services & Others (121-150) ──
  { name:'Hub Technologies', cat:'other', lat:9.0060, lon:38.7950, district:'Bole', desc:'IT services and software development company.' },
  { name:'Dream Tech', cat:'other', lat:9.0080, lon:38.7920, district:'Bole', desc:'Technology solutions and digital transformation.' },
  { name:'Atlantic IT Solutions', cat:'other', lat:9.0100, lon:38.7890, district:'Bole', desc:'IT consulting and managed services.' },
  { name:'MS Consultancy PLC', cat:'other', lat:9.0120, lon:38.7860, district:'Bole', desc:'Management and business consulting firm.' },
  { name:'HTK General Trading PLC', cat:'shop', lat:9.0250, lon:38.7500, district:'Arada', desc:'General trading company for imported goods.' },
  { name:'SIMBA Cleaning Services (SIMBA PLC)', cat:'service', lat:9.0280, lon:38.7470, district:'Arada', desc:'Professional cleaning services for offices and homes.' },
  { name:'Magma Finance Ltd', cat:'other', lat:9.0230, lon:38.7520, district:'Kirkos', desc:'Microfinance and financial services.' },
  { name:'Madot Computer Solution PLC', cat:'other', lat:9.0130, lon:38.7800, district:'Kirkos', desc:'Computer hardware, software and IT support.' },
  { name:'Mesaf Trading PLC', cat:'shop', lat:9.0270, lon:38.7490, district:'Arada', desc:'Import-export and general trading.' },
  { name:'Popular Electronics', cat:'shop', lat:9.0310, lon:38.7440, district:'Arada', desc:'Electronics retailer with wide product range.' },
  { name:'Esayas Habte Brokerage', cat:'other', lat:9.0290, lon:38.7460, district:'Arada', desc:'Customs and trade brokerage services.' },
  { name:'Ethio Legal Shield LLP', cat:'service', lat:9.0200, lon:38.7590, district:'Kirkos', desc:'Legal services and business law firm.' },
  { name:'AMAS Advocates LLP', cat:'service', lat:9.0220, lon:38.7570, district:'Kirkos', desc:'Law firm specializing in corporate and tax law.' },
  { name:'Eve Business Solutions PLC', cat:'other', lat:9.0240, lon:38.7550, district:'Kirkos', desc:'Business process outsourcing and HR services.' },
  { name:'Milly Ethiopia Car Rental', cat:'service', lat:9.0020, lon:38.7990, district:'Bole', desc:'Vehicle rental services near the airport.' },
  { name:'Liya Internet Cafe', cat:'other', lat:9.0340, lon:38.7400, district:'Gullele', desc:'Internet and printing services cafe.' },
  { name:'Shoa Bakery & Flour Factory PLC', cat:'restaurant', lat:9.0360, lon:38.7380, district:'Gullele', desc:'Bakery producing bread and baked goods for Addis Ababa.' },
  { name:'AMG Coffee Export', cat:'other', lat:9.0040, lon:38.7970, district:'Bole', desc:'Ethiopian specialty coffee exporter.' },
  { name:'Rivonia Eatery', cat:'restaurant', lat:9.0055, lon:38.7940, district:'Bole', desc:'South African-Ethiopian fusion restaurant.' },
  { name:'Samuel Stationery', cat:'shop', lat:9.0320, lon:38.7430, district:'Gullele', desc:'Office supplies and stationery shop.' },
  { name:'Walta Media and Communication', cat:'other', lat:9.0160, lon:38.7710, district:'Kirkos', desc:'Media company producing news and entertainment content.' },
  { name:'Nesredine Hussen Gutago', cat:'service', lat:9.0365, lon:38.7365, district:'Kolfe Keranio', desc:'General business services and consulting.' },
  { name:'Ministry of Mines and Energy', cat:'service', lat:9.0370, lon:38.7370, district:'Kolfe Keranio', desc:'Government ministry overseeing mining and energy policy in Ethiopia.' },
  { name:'Lewa PLC', cat:'other', lat:9.0190, lon:38.7640, district:'Kirkos', desc:'Business services and trading company.' },
  { name:'Big Boss Mo Trading PLC', cat:'shop', lat:9.0205, lon:38.7605, district:'Kirkos', desc:'General trading and import business.' },
  { name:'Htk General Trading', cat:'shop', lat:9.0210, lon:38.7610, district:'Kirkos', desc:'General trading and import business.' },
  { name:'JTI Ethiopia', cat:'other', lat:9.0030, lon:38.7780, district:'Nifas Silk-Lafto', desc:'Japan Tobacco International Ethiopia operations.' },
  { name:'Safaricom Telecommunications Ethiopia', cat:'other', lat:9.0085, lon:38.7905, district:'Bole', desc:'Kenya-based telecom operating in Ethiopia market.' },
  { name:'Huawei Technologies Ethiopia', cat:'other', lat:9.0095, lon:38.7885, district:'Bole', desc:'Chinese tech company with major telecom contracts in Ethiopia.' },
  { name:'Zare Innovations (BPO/IT)', cat:'other', lat:9.0115, lon:38.7855, district:'Bole', desc:'BPO and IT services startup.' },
];

// ── Category → DB enum mapping ─────────────────────────────────────────────
const CAT_MAP = {
  restaurant:'restaurant', shop:'shop', service:'service',
  health:'health', other:'other', realestate:'realestate',
  event:'event', portfolio:'portfolio', course:'course'
};

// ── Theme colors per category ──────────────────────────────────────────────
const CAT_COLORS = {
  restaurant:'#F97316', shop:'#3B82F6', service:'#8B5CF6',
  health:'#10B981', other:'#D4AF37', realestate:'#06B6D4',
};

async function seed() {
  const client = await pool.connect();
  console.log('\n🌱 Empire X Seed — 50 Ethiopian users + 150 Addis Ababa businesses\n');

  try {
    console.log('🗑  Clearing existing data...');
    await client.query(`
      TRUNCATE TABLE
        delivery_updates, return_requests, price_alerts, product_variants,
        cart_items, wishlists, commissions, poll_votes, post_hashtags, hashtags, coupons,
        push_subscriptions, point_transactions, course_enrollments, course_lessons,
        job_applications, event_tickets,
        saves, reports, blocks, wallet_transactions, wallets,
        story_views, stories,
        messages, conversations, task_bids, tasks,
        comments, likes, follows, notifications,
        orders, reviews, products, showrooms, businesses,
        jobs, events, courses, posts,
        user_profiles, users
      RESTART IDENTITY CASCADE
    `);
    console.log('  ✅ Cleared.\n');

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // ── Dev accounts (always available) ─────────────────────────────────────
    console.log('🔑 Creating dev accounts...');
    const devAccounts = [
      { email: 'admin@empirex.app', hash: adminHash, name: 'Admin User', role: 'admin' },
      { email: 'test@empirex.app', hash: passwordHash, name: 'Test User', role: 'user' },
    ];
    for (const acc of devAccounts) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, provider)
         VALUES ($1,$2,$3,$4,TRUE,'local') RETURNING id, email, full_name, role`,
        [acc.email, acc.hash, acc.name, acc.role]
      );
      await client.query(
        `INSERT INTO user_profiles (user_id, display_name, bio, profile_type, has_business_profile, is_verified, location, latitude, longitude)
         VALUES ($1,$2,$3,'personal',TRUE,TRUE,'Bole, Addis Ababa, Ethiopia',9.0050,38.7910)`,
        [rows[0].id, acc.name, `${acc.name} — Empire X development account`]
      );
      await client.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, 'ETB')`,
        [rows[0].id, acc.role === 'admin' ? 50000 : 5000]
      );
    }
    console.log(`  ✅ admin@empirex.app / ${ADMIN_PASSWORD}`);
    console.log(`  ✅ test@empirex.app / ${TEST_PASSWORD}\n`);

    // ── 1. Create 50 Ethiopian users ────────────────────────────────────────
    console.log('👥 Creating 50 Ethiopian users...');
    const users = [];
    for (let i = 0; i < 50; i++) {
      const [first, last] = ETHIOPIAN_NAMES[i];
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@empirex.test`;
      const district = pick(ADDIS_DISTRICTS);
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, provider)
         VALUES ($1,$2,$3,$4,TRUE,'local') RETURNING id, email, full_name`,
        [email, passwordHash, `${first} ${last}`, 'user']
      );
      users.push({ ...rows[0], first, last, district });
    }
    console.log(`  ✅ ${users.length} users (password: ${TEST_PASSWORD})\n`);

    // ── 2. Wallets for all users ─────────────────────────────────────────────
    console.log('💰 Creating wallets...');
    for (const user of users) {
      await client.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, 'ETB')`,
        [user.id, randFloat(500, 25000)]
      );
    }
    console.log('  ✅ Wallets done.\n');

    // ── 3. Create user profiles ──────────────────────────────────────────────
    console.log('📋 Creating user profiles...');
    for (const user of users) {
      const c = jitter(9.0200, 38.7520, 3);
      await client.query(
        `INSERT INTO user_profiles (
           user_id, display_name, bio, headline, location, phone,
           profile_type, has_business_profile, is_verified,
           follower_count, following_count, points,
           latitude, longitude
         ) VALUES ($1,$2,$3,$4,$5,$6,'personal',TRUE,$7,$8,$9,$10,$11,$12)`,
        [
          user.id, `${user.first} ${user.last}`,
          `${user.first} is a professional based in ${user.district}, Addis Ababa, Ethiopia.`,
          faker.person.jobTitle(),
          `${user.district}, Addis Ababa, Ethiopia`,
          `+2519${faker.string.numeric(8)}`,
          Math.random() > 0.6,
          rand(10, 800), rand(5, 300), rand(50, 2000),
          c.lat, c.lon,
        ]
      );
    }
    console.log('  ✅ Profiles done.\n');

    // ── 4. Create 150 businesses with full mini-website sections ────────────
    console.log('🏢 Creating 150 real Addis Ababa businesses...');
    const bizRecords = [];
    for (let i = 0; i < BUSINESSES.length; i++) {
      const biz = BUSINESSES[i];
      const owner = users[i % 50];
      const coords = jitter(biz.lat, biz.lon, 0.2);
      const color = CAT_COLORS[biz.cat] || '#D4AF37';
      const bizMeta = {
        name: biz.name, cat: biz.cat, desc: biz.desc,
        email: owner.email, phone: `+2511${faker.string.numeric(8)}`,
        address: `${biz.district}, Addis Ababa, Ethiopia`, color,
      };
      const { templateId, sections, hours } = buildBusinessSections(bizMeta);
      const { rows } = await client.query(
        `INSERT INTO businesses (
           owner_id, business_name, business_category, business_template,
           business_description, business_theme_color, business_sections, business_hours,
           business_contact_email, business_contact_phone,
           business_address, latitude, longitude
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [
          owner.id, biz.name, CAT_MAP[biz.cat] || 'other', templateId,
          biz.desc, color, sections, hours,
          owner.email, bizMeta.phone,
          bizMeta.address, coords.lat, coords.lon,
        ]
      );
      bizRecords.push({
        id: rows[0].id, owner_id: owner.id, name: biz.name, cat: biz.cat,
        desc: biz.desc, district: biz.district, color, ...bizMeta,
      });
    }
    console.log(`  ✅ ${bizRecords.length} businesses with templates.\n`);

    // ── 5. Create 150 showrooms (one per business) ───────────────────────────
    console.log('👑 Creating 150 showrooms...');
    const showroomRecords = [];
    for (let i = 0; i < bizRecords.length; i++) {
      const biz = bizRecords[i];
      const showroom = buildShowroomData({ ...biz, id: String(i) });
      const slug = `${showroom.slug}-${i}`;
      const { rows } = await client.query(
        `INSERT INTO showrooms (
           owner_id, title, description, slug, category, template,
           sections, status, theme_color, view_count
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, slug`,
        [
          biz.owner_id, showroom.title, showroom.description, slug,
          showroom.category, showroom.template, showroom.sections,
          showroom.status, showroom.theme_color, rand(50, 5000),
        ]
      );
      showroomRecords.push({ id: rows[0].id, owner_id: biz.owner_id, business_id: biz.id, slug: rows[0].slug });
    }
    console.log(`  ✅ ${showroomRecords.length} showrooms created.\n`);

    // ── Mark verified businesses — update profile is_verified for known brands ─
    console.log('✅ Marking verified businesses...');
    let verifiedCount = 0;
    for (const biz of bizRecords) {
      if (VERIFIED_BUSINESSES.includes(biz.name)) {
        await client.query(
          `UPDATE user_profiles SET is_verified = TRUE WHERE user_id = $1`,
          [biz.owner_id]
        );
        verifiedCount++;
      }
    }
    console.log(`  ✅ ${verifiedCount} business owners marked as verified.\n`);

    // ── 6. Create 300 products linked to businesses & showrooms ──────────────
    console.log('🛍️  Creating 300 products...');
    const products = [];
    // Rich, category-accurate product names with per-category price ranges from PRICE_RANGE
    const PRODUCT_NAMES_BY_CAT = {
      restaurant: {
        names: ['Injera Combo','Kitfo Special','Coffee Ceremony','Tibs Plate','Beyayenet','Doro Wot','Shiro','Firfir','Family Platter','Tej (Honey Wine)'],
        priceRange: PRICE_RANGE.restaurant,
      },
      shop: {
        names: ['Habesha Kemis','Leather Bag','Traditional Coffee Set','Handwoven Basket','Silver Jewelry','Gabi Blanket','Netela Shawl','Embroidered Dress','Kuta Scarf','Tilf Shoes'],
        priceRange: PRICE_RANGE.shop,
      },
      service: {
        names: ['Standard Service Package','Premium Consultation','Maintenance Contract','Installation Service','Annual Support Plan','Emergency Response','Training Program','Inspection Report'],
        priceRange: PRICE_RANGE.service,
      },
      health: {
        names: ['General Checkup','Specialist Consultation','Lab Test Panel','Dental Cleaning','Eye Exam','Physiotherapy Session','Wellness Package','Pharmacy Bundle'],
        priceRange: PRICE_RANGE.health,
      },
      other: {
        names: ['Standard Package','Premium Membership','Business Bundle','Annual Subscription','VIP Access','Starter Plan','Professional Plan','Enterprise Plan'],
        priceRange: PRICE_RANGE.other,
      },
    };
    for (let i = 0; i < 300; i++) {
      const biz = pick(bizRecords);
      const showroom = showroomRecords.find(s => s.business_id === biz.id) || pick(showroomRecords);
      const cat = biz.cat;
      const catData = PRODUCT_NAMES_BY_CAT[cat] || PRODUCT_NAMES_BY_CAT.other;
      const pr = catData.priceRange;
      const price = randFloat(pr.min, pr.max);
      const coords = jitter(9.0200, 38.7520, 3);
      const { rows } = await client.query(
        `INSERT INTO products (
           seller_id, business_id, showroom_id, title, description, price, currency,
           stock, category, status, view_count, average_rating, review_count,
           latitude, longitude, images
         ) VALUES ($1,$2,$3,$4,$5,$6,'ETB',$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [
          biz.owner_id, biz.id, showroom?.id || null,
          pick(catData.names) + ' — ' + biz.name,
          `Quality ${cat} offering from ${biz.name}. ${faker.commerce.productDescription()}`,
          price, rand(0, 100),
          pick(['shop','restaurant','service','health','other']),
          pick(['active','active','active','sold_out']),
          rand(0, 500), randFloat(2, 5), rand(0, 80),
          coords.lat, coords.lon,
          JSON.stringify([`https://picsum.photos/seed/prod${i}/400/400`]),
        ]
      );
      products.push({ id: rows[0].id, seller_id: biz.owner_id, business_id: biz.id });
    }
    console.log(`  ✅ ${products.length} products created.\n`);

    // ── 5. Create diverse posts — each user gets different post types ────────
    console.log('📝 Creating diverse posts for all 50 users...');
    const posts = [];
    const HASHTAGS_ETH = ['#AddisAbaba','#Ethiopia','#EmpireX','#HabeshaLife','#EthiopianBusiness','#Bole','#Merkato','#EthioTech','#AddisVibes','#AfricanEntrepreneur','#ShegerCity','#EthioBeauty'];
    const htag = () => pick(HASHTAGS_ETH);

    // Unsplash-style picsum images with different seeds per post type
    const IMG = {
      food:    (i) => `https://picsum.photos/seed/food${i}/800/600`,
      fashion: (i) => `https://picsum.photos/seed/fashion${i}/800/600`,
      city:    (i) => `https://picsum.photos/seed/city${i}/800/500`,
      biz:     (i) => `https://picsum.photos/seed/biz${i}/800/500`,
      nature:  (i) => `https://picsum.photos/seed/nature${i}/800/600`,
      event:   (i) => `https://picsum.photos/seed/event${i}/800/450`,
      product: (i) => `https://picsum.photos/seed/prod${i}/800/800`,
      people:  (i) => `https://picsum.photos/seed/people${i}/800/600`,
    };

    // Detect specialized business type for post template selection
    function getBizPostCat(biz) {
      const n = (biz.name || '').toLowerCase();
      if (n.includes('bank') || n.includes('microfinance') || n.includes('financial')) return 'bank';
      if (n.includes('telecom') || n.includes('safaricom') || n.includes('telebirr')) return 'telecom';
      if (n.includes('hotel') || n.includes('sheraton') || n.includes('hilton') || n.includes('hyatt') || n.includes('radisson') || n.includes('golden tulip') || n.includes('ramada')) return 'hotel';
      if (n.includes('yango') || n.includes(' ride') || n.includes('taxi') || n.includes('transport')) return 'ride';
      return biz.cat || 'other';
    }

    // Business category → post templates per type
    const BIZ_POSTS = {
      bank: {
        text:    (b,u) => `🏦 ${b.name} now offers digital account opening in minutes. No paperwork, no queues. ${htag()} #DigitalBanking`,
        image:   (b,u) => `📱 ${b.name} mobile app update: new features for faster transfers and bill payments. Download now! ${htag()}`,
        promo:   (b,u) => `💰 ${b.name} SPECIAL: Open a savings account this month and earn 7% annual interest. ${htag()} #Savings`,
        location:(b,u) => `📍 ${b.name} new branch now open in ${b.district}, Addis Ababa. Walk-ins welcome Mon–Fri 8AM–4PM. ${htag()}`,
        event:   (b,u) => `🎓 ${b.name} is hosting a FREE financial literacy workshop this Saturday. Learn to save, invest and grow. ${htag()}`,
      },
      telecom: {
        text:    (b,u) => `📡 ${b.name} 4G network expansion complete — now covering ${pick(ADDIS_DISTRICTS)} with faster speeds. ${htag()}`,
        image:   (b,u) => `📱 New from ${b.name}: 10GB data bundle for only 199 ETB. Valid 30 days. Dial *777# to activate. ${htag()}`,
        promo:   (b,u) => `🎉 ${b.name} PROMO: Get 20 bonus minutes free with every recharge above 100 ETB this week! ${htag()}`,
        location:(b,u) => `📍 ${b.name} service center now open in ${b.district}. SIM replacement, complaints, new subscriptions. ${htag()}`,
        event:   (b,u) => `🚀 ${b.name} launches 5G pilot in Bole and Kirkos districts! Experience the future of connectivity. ${htag()}`,
      },
      hotel: {
        text:    (b,u) => `✨ ${b.name} — where every stay feels like home. Book directly for best rates guaranteed. ${htag()} #AddisAbaba`,
        image:   (b,u) => `🛏️ Our newly renovated deluxe rooms at ${b.name} are now available. Comfort redefined. ${htag()}`,
        promo:   (b,u) => `🌟 WEEKEND SPECIAL at ${b.name}: 2 nights + breakfast + airport transfer from 7,500 ETB per couple! ${htag()}`,
        location:(b,u) => `📍 ${b.name} — located in the heart of ${b.district}, Addis Ababa. Easy access to AU, embassies & Bole. ${htag()}`,
        event:   (b,u) => `🎊 Host your next event at ${b.name}! Conference halls, wedding venues, and gala dinner setups available. ${htag()}`,
      },
      ride: {
        text:    (b,u) => `🚗 ${b.name} — safe, fast, affordable rides across Addis Ababa. Download the app now! ${htag()}`,
        image:   (b,u) => `✅ ${b.name} driver verification: all our drivers are background-checked and licensed. Your safety first. ${htag()}`,
        promo:   (b,u) => `🎉 FIRST RIDE FREE on ${b.name}! Use code EMPIREX at checkout. Valid for new users this week only. ${htag()}`,
        location:(b,u) => `📍 ${b.name} now operating in ${b.district} and surrounding areas. Average wait time: 3 minutes! ${htag()}`,
        event:   (b,u) => `🚀 ${b.name} launches corporate accounts for businesses in Addis — invoice billing, dedicated support. ${htag()}`,
      },
      restaurant: {
        text:    (b,u) => `🍽️ Today's special at ${b.name}: freshly prepared injera with tibs, misir and ayib. Come taste authentic Ethiopia! ${htag()}`,
        image:   (b,u) => `📸 Behind the scenes at ${b.name} kitchen — our chefs preparing today's menu with love. ${htag()} #EthiopianFood`,
        promo:   (b,u) => `🎉 SPECIAL OFFER at ${b.name}: 30% off all meals this weekend! Book your table now — limited seats. ${htag()}`,
        location:(b,u) => `📍 Find us at ${b.name}, ${b.district}, Addis Ababa. Open daily 8AM–10PM. Come visit! ${htag()}`,
        event:   (b,u) => `🎊 Live music + dinner at ${b.name} this Friday evening! Traditional Ethiopian music while you dine. ${htag()}`,
      },
      shop: {
        text:    (b,u) => `🛍️ New arrivals just landed at ${b.name}! Habesha clothing, modern fashion & accessories. ${htag()}`,
        image:   (b,u) => `✨ Check out our new collection at ${b.name} — handcrafted with love from Ethiopian artisans. ${htag()}`,
        promo:   (b,u) => `💥 FLASH SALE at ${b.name}: up to 50% OFF selected items. This weekend only! ${htag()} #Sale`,
        location:(b,u) => `📍 Visit ${b.name} in ${b.district}! We also offer nationwide delivery 🚚 DM to order. ${htag()}`,
        event:   (b,u) => `🎨 Grand opening of our new showroom at ${b.name}! Free gifts for first 50 customers. ${htag()}`,
      },
      service: {
        text:    (b,u) => `💼 ${b.name} just completed another major project in ${b.district}. Excellence is our standard! ${htag()}`,
        image:   (b,u) => `🏗️ Work in progress — ${b.name} team on site in ${b.district}. Quality you can see. ${htag()}`,
        promo:   (b,u) => `🔧 ${b.name} is offering FREE consultation this month. First 20 clients only! Book now. ${htag()}`,
        location:(b,u) => `📍 ${b.name} office now open in ${b.district}, Addis Ababa. Walk-ins welcome! ${htag()}`,
        event:   (b,u) => `📢 ${b.name} is hosting a FREE workshop on ${pick(['tax planning','business growth','digital marketing','construction safety'])} this Saturday. Limited spots! ${htag()}`,
      },
      health: {
        text:    (b,u) => `🏥 ${b.name} reminder: regular checkups save lives. Book your appointment today! ${htag()}`,
        image:   (b,u) => `💊 Our team at ${b.name} is ready to serve you. Modern equipment, caring staff. ${htag()}`,
        promo:   (b,u) => `🩺 FREE health screening at ${b.name} this Saturday, 9AM–2PM. No appointment needed. ${htag()}`,
        location:(b,u) => `📍 ${b.name} is located in ${b.district}. Open Mon–Sat. Emergency line available 24/7. ${htag()}`,
        event:   (b,u) => `🧘 Join our FREE wellness seminar at ${b.name}: nutrition, mental health & fitness. This Sunday! ${htag()}`,
      },
      other: {
        text:    (b,u) => `🚀 Big news from ${b.name}! Expanding services across Addis Ababa. Exciting times ahead. ${htag()}`,
        image:   (b,u) => `📊 ${b.name} team celebrating Q1 milestones! Thank you to all our amazing clients. ${htag()}`,
        promo:   (b,u) => `💡 ${b.name} special package: 25% off for new clients this month only. Contact us now! ${htag()}`,
        location:(b,u) => `📍 ${b.name} is open in ${b.district}, Addis Ababa. Come visit or call us to learn more. ${htag()}`,
        event:   (b,u) => `🌍 ${b.name} is sponsoring this year's Addis Business Summit. Join us! ${htag()}`,
      },
    };

    // Personal post templates — varied topics
    const PERSONAL = [
      { type:'text',    fn: (u) => `Exploring ${pick(ADDIS_DISTRICTS)} today — this city never gets old 🌆 ${htag()}` },
      { type:'image',   fn: (u) => `Morning in ${pick(ADDIS_DISTRICTS)} ☀️ Started the day with a fresh run and Ethiopian coffee. ${htag()}` },
      { type:'text',    fn: (u) => `Just had the best tibs I've tasted in years 🍖 Addis food scene is on another level. ${htag()}` },
      { type:'image',   fn: (u) => `Sunset from ${pick(['Entoto Hill','Bole Skyline','Gulele Garden','Mt. Yerer'])} 🌅 This city is breathtaking. ${htag()}` },
      { type:'text',    fn: (u) => `Power cut in ${pick(ADDIS_DISTRICTS)} again 😅 Working from the café. Habesha resilience ☕ ${htag()}` },
      { type:'text',    fn: (u) => `Traffic on Bole road at 6PM is wild 🚗 But still love this city. ${htag()}` },
      { type:'image',   fn: (u) => `Ethiopian Airlines is genuinely one of the best airlines in the world ✈️ Proud moment! ${htag()}` },
      { type:'text',    fn: (u) => `Weekends in Addis: tej, music, family, friends. Life is good 🎵 ${htag()}` },
      { type:'image',   fn: (u) => `Entoto Natural Park this morning 🌲 Hidden gem right in the city! ${htag()}` },
      { type:'text',    fn: (u) => `Working late again but the hustle is real 💪 ${htag()} #Entrepreneur` },
      { type:'text',    fn: (u) => `Grateful for another day of opportunities in Ethiopia 🇪🇹 ${htag()}` },
      { type:'image',   fn: (u) => `Networking at ${pick(['Edna Mall','Sheraton Addis','Dembel City Center','Capital Hotel'])} 🔥 Great connections made! ${htag()}` },
      { type:'text',    fn: (u) => `Street food in Merkato on Saturday morning — pure joy 🥘 ${htag()}` },
      { type:'image',   fn: (u) => `Ethiopian New Year (Enkutatash) prep is underway 🌸 New year, new goals! ${htag()}` },
      { type:'text',    fn: (u) => `Reading ${pick(['Things Fall Apart','Half of a Yellow Sun','Americanah','Arrow of God'])} this week 📚 African literature hits different. ${htag()}` },
    ];

    // Poll templates — all different questions
    const POLLS = [
      { q: `What's your favorite Ethiopian dish? 🍽️ ${htag()}`, opts: ['Injera & Tibs','Kitfo','Doro Wot','Beyayenet'] },
      { q: `Best district to live in Addis? 🏘️ ${htag()}`, opts: ['Bole','Kirkos','Yeka','Gullele'] },
      { q: `How do you prefer to shop in Addis? 🛍️ ${htag()}`, opts: ['Merkato','Malls','Online','Street markets'] },
      { q: `Best Ethiopian coffee? ☕ ${htag()}`, opts: ['Yirgacheffe','Harrar','Sidama','Jimma'] },
      { q: `Favorite way to travel in Addis? 🚗 ${htag()}`, opts: ['Private car','Taxi/Ride app','Minibus','Walking'] },
      { q: `Best time to visit Ethiopia? ✈️ ${htag()}`, opts: ['Timkat (Jan)','Fasika (Apr)','Meskel (Sep)','Enkutatash (Sep)'] },
      { q: `Favorite Addis mall? 🏬 ${htag()}`, opts: ['Edna Mall','Dembel City','Century Mall','Friendship Mall'] },
      { q: `Where do you work best? 💼 ${htag()}`, opts: ['Office','Home','Café','Co-working space'] },
      { q: `Best Ethiopian music genre? 🎵 ${htag()}`, opts: ['Traditional','Jazz','Hip-hop','Gospel'] },
      { q: `What matters most in a business? ${htag()}`, opts: ['Quality','Price','Location','Customer service'] },
    ];

    // Assign each user a unique post type rotation so feeds look different
    const POST_TYPE_SEQUENCES = [
      ['text','image','promo','poll','text','location','event','image'],
      ['image','text','poll','promo','image','text','event','location'],
      ['promo','text','image','location','poll','event','text','image'],
      ['poll','image','text','promo','location','text','image','event'],
      ['location','promo','text','image','event','poll','text','image'],
    ];

    let imgCounter = 1;
    let pollIdx = 0;

    // Build one post per user per slot, ensuring each user has a unique mix
    // 50 users × 4 posts each = 200 posts, shuffled in the feed
    const allPostData = [];
    for (let u = 0; u < users.length; u++) {
      const user = users[u];
      const seq = POST_TYPE_SEQUENCES[u % POST_TYPE_SEQUENCES.length];
      const userBizzes = bizRecords.filter(b => b.owner_id === user.id);

      for (let s = 0; s < 4; s++) {
        const postType = seq[s % seq.length];
        let content, image_url = null, poll_options = null, poll_ends_at = null;
        const imgKey = Object.keys(IMG)[imgCounter % Object.keys(IMG).length];

        // Pick a different business per post slot for variety
        const activeBiz = userBizzes.length > 0 ? pick(userBizzes) : null;
        // 82% business posts when user owns businesses, 0% when they don't
        const bizPostChance = userBizzes.length > 0 ? 0.82 : 0.0;

        if (postType === 'poll') {
          const p = POLLS[pollIdx % POLLS.length];
          pollIdx++;
          content = p.q;
          poll_options = JSON.stringify(p.opts.map((text, i) => ({ id: String.fromCharCode(97+i), text, vote_count: rand(0,80) })));
          poll_ends_at = new Date(Date.now() + (7 + rand(0,14)) * 86400000).toISOString();
        } else if (activeBiz && Math.random() < bizPostChance) {
          // Business post — use specialized template based on business name/type
          const postCat = getBizPostCat(activeBiz);
          const templates = BIZ_POSTS[postCat] || BIZ_POSTS.other;
          const tmpl = templates[postType] || templates.text;
          content = tmpl(activeBiz, user);
          if (postType === 'image' || postType === 'promo' || postType === 'event') {
            image_url = IMG[imgKey](imgCounter);
            imgCounter++;
          }
        } else {
          // Personal post
          const pIdx = (u * 4 + s) % PERSONAL.length;
          const pt = PERSONAL[pIdx];
          content = pt.fn(user);
          if (pt.type === 'image') {
            image_url = IMG[imgKey](imgCounter);
            imgCounter++;
          }
        }

        allPostData.push({
          user, content, image_url, poll_options, poll_ends_at,
          // Spread created_at over last 7 days so feed order is meaningful
          created_at: new Date(Date.now() - rand(0, 7 * 24 * 3600 * 1000)).toISOString(),
        });
      }
    }

    // Shuffle so posts from all users interleave
    for (let i = allPostData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPostData[i], allPostData[j]] = [allPostData[j], allPostData[i]];
    }

    for (const p of allPostData) {
      const { rows } = await client.query(
        `INSERT INTO posts (author_id, author_name, content, image_url, post_type, poll_options, poll_ends_at, like_count, comment_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id`,
        [
          p.user.id, `${p.user.first} ${p.user.last}`,
          p.content, p.image_url,
          p.poll_options ? 'text' : (p.image_url ? 'image' : 'text'),
          p.poll_options, p.poll_ends_at,
          rand(0, 400), rand(0, 40),
          p.created_at,
        ]
      );
      posts.push({ id: rows[0].id, author_id: p.user.id });
    }
    console.log(`  ✅ ${posts.length} diverse posts created (${users.length} users × 4 types, shuffled).\n`);

    // ── 6. Create 100 tasks ──────────────────────────────────────────────────
    console.log('📋 Creating 100 tasks...');
    const tasks = [];
    const TASK_TITLES = {
      bill_payment:['Pay EEPCO electricity bill','Pay Ethio Telecom bill','Pay water utility bill'],
      document_pickup:['Collect passport from Immigration','Pick up business license from municipality','Collect TIN certificate'],
      gov_form:['Fill trade license renewal form','Process customs clearance documents','Apply for business permit'],
      delivery:['Deliver documents to Kirkos sub-city','Deliver package from Merkato to Bole','Deliver food order in Yeka'],
      queue_standing:['Stand in queue at CBE for account opening','Wait at Passport Office Gotera','Queue at driver\'s license office'],
      grocery:['Buy groceries from Shoa Supermarket','Purchase items from Merkato','Buy vegetables from Shiro Meda'],
      other:['Help with office move','Assist with event setup','Translate document from English to Amharic'],
    };
    const TASK_TYPES_LIST = Object.keys(TASK_TITLES);
    for (let i = 0; i < 100; i++) {
      const user = pick(users);
      const taskType = pick(TASK_TYPES_LIST);
      const coords = jitter(9.0200, 38.7520, 3);
      const { rows } = await client.query(
        `INSERT INTO tasks (requester_id, task_type, title, description, location, offered_payment, currency, status, deadline, latitude, longitude)
         VALUES ($1,$2,$3,$4,$5,$6,'ETB',$7,$8,$9,$10) RETURNING id`,
        [
          user.id, taskType,
          pick(TASK_TITLES[taskType]),
          `Task in ${pick(ADDIS_DISTRICTS)}, Addis Ababa. ${faker.lorem.sentence()}`,
          `${pick(ADDIS_DISTRICTS)}, Addis Ababa`,
          randFloat(100, 1500),
          pick(['open','open','open','in_progress']),
          faker.date.soon({ days: 14 }),
          coords.lat, coords.lon,
        ]
      );
      tasks.push({ id: rows[0].id, requester_id: user.id });
    }
    console.log(`  ✅ ${tasks.length} tasks created.\n`);

    // ── 7. Create 150 orders ─────────────────────────────────────────────────
    console.log('🛒 Creating 150 orders...');
    let orderCount = 0;
    for (let i = 0; i < 180 && orderCount < 150; i++) {
      const buyer = pick(users);
      const product = pick(products);
      if (product.seller_id === buyer.id) continue;
      const qty = rand(1, 3);
      const price = randFloat(100, 3000);
      await client.query(
        `INSERT INTO orders (buyer_id, seller_id, product_id, product_title, quantity, unit_price, total_price, currency, status, buyer_name, buyer_email, delivery_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'ETB',$8,$9,$10,$11)`,
        [
          buyer.id, product.seller_id, product.id,
          faker.commerce.productName(), qty, price, price * qty,
          pick(['pending','paid','processing','completed','completed','cancelled']),
          `${buyer.first} ${buyer.last}`, buyer.email,
          `${pick(ADDIS_DISTRICTS)}, Addis Ababa`,
        ]
      );
      orderCount++;
    }
    console.log(`  ✅ ${orderCount} orders created.\n`);

    // ── 8. Reviews, Follows, Likes, Comments, Notifications ─────────────────
    console.log('⭐ Creating reviews, follows, likes, comments, notifications...');
    const reviewPairs = new Set();
    for (let i = 0; i < 120; i++) {
      const reviewer = pick(users);
      const product = pick(products);
      const key = `${reviewer.id}-${product.id}`;
      if (reviewPairs.has(key) || product.seller_id === reviewer.id) continue;
      reviewPairs.add(key);
      await client.query(
        `INSERT INTO reviews (product_id, reviewer_id, rating, comment) VALUES ($1,$2,$3,$4)`,
        [product.id, reviewer.id, rand(1, 5), faker.lorem.sentences(1)]
      );
    }
    const followPairs = new Set();
    for (let i = 0; i < 100; i++) {
      const a = pick(users); const b = pick(users);
      const key = `${a.id}-${b.id}`;
      if (a.id === b.id || followPairs.has(key)) continue;
      followPairs.add(key);
      await client.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [a.id, b.id]);
    }
    const likePairs = new Set();
    for (let i = 0; i < 120; i++) {
      const user = pick(users); const post = pick(posts);
      const key = `${user.id}-${post.id}`;
      if (likePairs.has(key)) continue;
      likePairs.add(key);
      await client.query(`INSERT INTO likes (target_id, target_type, user_id) VALUES ($1,'post',$2) ON CONFLICT DO NOTHING`, [post.id, user.id]);
    }
    for (let i = 0; i < 80; i++) {
      const user = pick(users); const post = pick(posts);
      await client.query(
        `INSERT INTO comments (post_id, author_id, author_name, content) VALUES ($1,$2,$3,$4)`,
        [post.id, user.id, `${user.first} ${user.last}`, faker.lorem.sentences(1)]
      );
    }
    const NOTIF_TYPES = ['like','comment','follow','message','order','task_update'];
    for (let i = 0; i < 200; i++) {
      const user = pick(users);
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, is_read) VALUES ($1,$2,$3,$4,$5)`,
        [user.id, pick(NOTIF_TYPES), faker.lorem.sentence().slice(0, 60), faker.lorem.sentences(1), Math.random() > 0.4]
      );
    }
    console.log('  ✅ Reviews, follows, likes, comments, notifications created.\n');

    // ── 9. Conversations & messages ──────────────────────────────────────────
    console.log('💬 Creating 50 conversations & 200 messages...');
    const convs = [];
    for (let i = 0; i < 60; i++) {
      const u1 = pick(users); const u2 = pick(users);
      if (u1.id === u2.id) continue;
      const lastMsg = faker.lorem.sentence().slice(0, 80);
      const { rows } = await client.query(
        `INSERT INTO conversations (participant_ids, participant_names, type, last_message) VALUES ($1,$2,'dm',$3) RETURNING id`,
        [JSON.stringify([u1.id, u2.id]), JSON.stringify([`${u1.first} ${u1.last}`, `${u2.first} ${u2.last}`]), lastMsg]
      );
      convs.push({ id: rows[0].id, users: [u1, u2] });
    }
    for (let i = 0; i < 200 && convs.length > 0; i++) {
      const conv = pick(convs); const sender = pick(conv.users);
      await client.query(
        `INSERT INTO messages (conversation_id, sender_id, sender_name, content, type) VALUES ($1,$2,$3,$4,'text')`,
        [conv.id, sender.id, `${sender.first} ${sender.last}`, faker.lorem.sentences(rand(1, 2))]
      );
    }
    console.log(`  ✅ ${convs.length} conversations & 200 messages.\n`);

    // ── 10. Events, Jobs, Courses, Stories ───────────────────────────────────
    console.log('🎫 Creating events, jobs, courses, stories...');
    const EVENT_TITLES = [
      'Addis Tech Summit 2025','Ethiopian Business Forum','Habesha Fashion Week',
      'Coffee Origin Tour','Startup Ethiopia Demo Day','African Music Festival Addis',
      'Women in Business Conference','EthioTech Innovation Awards','Bole Food Festival',
      'Ethiopian Entrepreneurs Summit',
    ];
    for (let i = 0; i < 30; i++) {
      const user = pick(users);
      const biz = pick(bizRecords);
      const coords = jitter(biz.lat || 9.02, biz.lon || 38.75, 1);
      await client.query(
        `INSERT INTO events (organizer_id, title, description, location, start_at, ticket_price, currency, status, capacity, is_online)
         VALUES ($1,$2,$3,$4,$5,$6,'ETB','published',$7,$8)`,
        [
          user.id,
          i < EVENT_TITLES.length ? EVENT_TITLES[i] : faker.lorem.words(4),
          `Join us for ${faker.lorem.sentences(2)} Organized by ${biz.name}.`,
          `${pick(ADDIS_DISTRICTS)}, Addis Ababa`,
          faker.date.soon({ days: 90 }),
          Math.random() > 0.4 ? randFloat(50, 500) : 0,
          rand(50, 1000), Math.random() > 0.7,
        ]
      );
    }
    const JOB_TITLES = [
      'Senior Software Engineer','Marketing Manager','Operations Director','Sales Executive',
      'Financial Analyst','HR Manager','Product Manager','Data Analyst',
      'Civil Engineer','Business Development Manager',
    ];
    for (let i = 0; i < 30; i++) {
      const user = pick(users); const biz = pick(bizRecords);
      await client.query(
        `INSERT INTO jobs (poster_id, business_id, title, description, location, job_type, salary_min, salary_max, currency, status, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ETB','open',$9)`,
        [
          user.id, biz.id,
          i < JOB_TITLES.length ? JOB_TITLES[i] : faker.person.jobTitle(),
          `${biz.name} is seeking a qualified professional. ${faker.lorem.sentences(3)}`,
          `${biz.name}, ${pick(ADDIS_DISTRICTS)}, Addis Ababa`,
          pick(['full_time','part_time','contract','freelance']),
          randFloat(8000, 25000), randFloat(25000, 80000),
          pick(['Technology','Finance','Operations','Marketing','Education','Other']),
        ]
      );
    }
    const COURSE_TITLES = [
      'Amharic for Business','Ethiopian Tax & Accounting','Digital Marketing Ethiopia',
      'Mobile App Development','Entrepreneurship in Africa',
      'Export-Import Fundamentals Ethiopia','Coffee Business Masterclass',
    ];
    for (let i = 0; i < 25; i++) {
      const user = pick(users);
      await client.query(
        `INSERT INTO courses (creator_id, title, description, price, currency, category, level, is_published)
         VALUES ($1,$2,$3,$4,'ETB',$5,$6,TRUE)`,
        [
          user.id,
          i < COURSE_TITLES.length ? COURSE_TITLES[i] : faker.lorem.words(4),
          `${faker.lorem.sentences(3)} Taught by ${user.first} ${user.last}.`,
          Math.random() > 0.3 ? randFloat(200, 3000) : 0,
          pick(['Technology','Business','Education','Health','Other']),
          pick(['beginner','intermediate','advanced']),
        ]
      );
    }
    // ── Story themes: category-contextual image seeds and captions ──────────
    const STORY_THEMES = {
      restaurant: { seed: 'food',    captions: ['Fresh off the kitchen today 🍽️ #EthiopianFood', 'Today\'s special is ready — come taste it! ✨', 'Coffee ceremony at ${biz} ☕ Join us'] },
      shop:       { seed: 'fashion', captions: ['New arrivals just dropped 🛍️ #Habesha', 'Style that speaks for itself 👗', 'Limited stock — order fast!'] },
      service:    { seed: 'office',  captions: ['Another project completed! 💼 #EmpireX', 'Team energy today ⚡ Big things ahead', 'Excellence delivered 🏆 #AddisAbaba'] },
      health:     { seed: 'medical', captions: ['Your health is our mission 💊', 'Our team is ready for you today 🏥', 'Book your checkup — prevention is power!'] },
      other:      { seed: 'city',    captions: ['Addis Ababa 🌆 #ShegerCity', 'Morning energy from the city ☀️', 'Big moves in ${district} today 💪 #EmpireX'] },
    };
    for (let i = 0; i < 40; i++) {
      const user = pick(users);
      const userBiz = bizRecords.find(b => b.owner_id === user.id);
      const theme = STORY_THEMES[userBiz?.cat] || STORY_THEMES.other;
      const rawCaption = pick(theme.captions)
        .replace('${biz}', userBiz?.name || 'our place')
        .replace('${district}', pick(ADDIS_DISTRICTS));
      await client.query(
        `INSERT INTO stories (user_id, media_url, media_type, caption, expires_at)
         VALUES ($1,$2,'image',$3,NOW()+INTERVAL '24 hours')`,
        [
          user.id,
          `https://picsum.photos/seed/${theme.seed}${i}/400/700`,
          rawCaption,
        ]
      );
    }
    console.log('  ✅ Events, jobs, courses, stories created.\n');

    // ── 11. Product variants, cart, wishlists, coupons, hashtags, polls ──
    console.log('🔧 Seeding extended features...');
    for (let i = 0; i < 80; i++) {
      const product = pick(products);
      await client.query(
        `INSERT INTO product_variants (product_id, name, value, price, stock, sku)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [product.id, pick(['Size','Color','Type']), pick(['S','M','L','XL','Red','Blue','Standard']), randFloat(50, 500), rand(5, 50), `SKU-${faker.string.alphanumeric(6).toUpperCase()}`]
      );
    }
    for (let i = 0; i < 60; i++) {
      const user = pick(users); const product = pick(products);
      await client.query(
        `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [user.id, product.id, rand(1, 3)]
      );
    }
    for (let i = 0; i < 80; i++) {
      const user = pick(users); const product = pick(products);
      await client.query(
        `INSERT INTO wishlists (user_id, product_id, alert_price) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [user.id, product.id, randFloat(100, 1000)]
      );
    }
    const COUPON_CODES = ['ADDIS10','BOLE20','EMPIRE15','HABESHA25','MERKATO30'];
    for (let i = 0; i < 25; i++) {
      const seller = pick(users);
      await client.query(
        `INSERT INTO coupons (seller_id, code, discount_type, discount_value, min_order, usage_limit, is_active, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW()+INTERVAL '90 days') ON CONFLICT DO NOTHING`,
        [seller.id, COUPON_CODES[i % COUPON_CODES.length] + i, pick(['percentage','fixed']), pick([10, 15, 20, 100, 200]), randFloat(100, 500), rand(10, 100)]
      );
    }
    const TAGS = ['AddisAbaba','Ethiopia','EmpireX','HabeshaLife','EthiopianBusiness','Bole','Merkato','EthioTech','AddisVibes','AfricanEntrepreneur'];
    for (const tag of TAGS) {
      await client.query(`INSERT INTO hashtags (name, post_count) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [`#${tag}`, rand(5, 100)]);
    }
    // Polls already seeded above as part of diverse posts
    // (kept for reference — no additional polls needed)
    for (let i = 0; i < 50; i++) {
      const task = pick(tasks); const bidder = pick(users);
      if (task.requester_id === bidder.id) continue;
      await client.query(
        `INSERT INTO task_bids (task_id, bidder_id, bid_amount, status, message)
         VALUES ($1,$2,$3,$4,$5)`,
        [task.id, bidder.id, randFloat(100, 1200), pick(['pending','pending','accepted','rejected']), faker.lorem.sentence()]
      );
    }
    for (let i = 0; i < 60; i++) {
      const user = pick(users);
      const target = pick([...products.map(p => ({ id: p.id, type: 'product' })), ...showroomRecords.map(s => ({ id: s.id, type: 'showroom' }))]);
      await client.query(
        `INSERT INTO saves (user_id, target_id, target_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [user.id, target.id, target.type]
      );
    }
    console.log('  ✅ Variants, cart, wishlists, coupons, hashtags, polls, bids, saves.\n');

    // ── 12. Export dev credentials ───────────────────────────────────────────
    const credentials = [
      { email: 'admin@empirex.app', password: ADMIN_PASSWORD, role: 'admin', name: 'Admin User' },
      { email: 'test@empirex.app', password: TEST_PASSWORD, role: 'user', name: 'Test User' },
      ...users.map(u => ({
        email: u.email,
        password: TEST_PASSWORD,
        role: 'user',
        name: u.full_name,
      })),
    ];
    const credPath = path.join(__dirname, 'dev-credentials.json');
    fs.writeFileSync(credPath, JSON.stringify({ password_note: 'All seeded users share Test1234!', accounts: credentials }, null, 2));
    console.log(`📄 Credentials saved to ${credPath}\n`);

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('━'.repeat(60));
    console.log('🎉 SEED COMPLETE!\n');
    console.log('👤 Dev logins:');
    console.log(`   Admin:  admin@empirex.app  /  ${ADMIN_PASSWORD}`);
    console.log(`   Test:   test@empirex.app   /  ${TEST_PASSWORD}`);
    console.log(`   Users:  abebe.girma0@empirex.test … (50 accounts)  /  ${TEST_PASSWORD}\n`);
    console.log('📊 Data summary:');
    console.log(`   52 accounts (50 + admin + test)  |  150 Addis Ababa businesses`);
    console.log(`   150 showrooms with category templates  |  300 products`);
    console.log(`   200 posts  |  100 tasks  |  ~145 orders  |  80 product variants`);
    console.log(`   30 events  |  30 jobs  |  25 courses  |  40 stories`);
    console.log(`   Cart, wishlists, coupons, hashtags, polls, saves seeded`);
    console.log(`   ${convs.length} conversations  |  200 messages  |  200 notifications`);
    console.log('\n💡 Payment: Stripe only (no Chapa). Configure STRIPE_SECRET_KEY in backend/.env');
    console.log('━'.repeat(60));

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
