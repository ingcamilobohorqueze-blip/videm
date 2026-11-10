/**
 * CONFIGURACIÓN MAESTRA INDEPENDIENTE - TREX IPTV (PLAN 90 DÍAS)
 * Este módulo centraliza las credenciales, fechas de contrato, categorías, EPG (EDT)
 * y logos oficiales verificados de la parrilla IPTV, 100% separado de VIDEM.
 */

const GVP_BASE = 'http://media.gvp.telefonica.com/storagearea0/IMAGES';

module.exports = {
  subscription: {
    provider: 'TREX IPTV',
    plan: 'Suscripción Oficial 90 Días',
    status: 'Active',
    isTrial: false,
    startDate: '2026-11-03',
    expirationDate: '2027-02-04',
    maxConnections: 1,
    playlistName: 'PARRILLA TOTAL TV (DIRECTV / CLARO / MOVISTAR)'
  },

  credentials: {
    host: 'line.prim01.com',
    port: 80,
    username: '493da0239d',
    password: '69b4dd0ebc7f'
  },

  endpoints: {
    curatedM3U: 'https://videm.tv/api/trex',
    xtreamServerUrl: 'http://line.prim01.com:80',
    rawM3UPlus: 'http://line.prim01.com:80/get.php?username=493da0239d&password=69b4dd0ebc7f&type=m3u_plus&output=ts',
    // Guía EDT / EPG descomprimida en XML puro (compatible 100% con MyIPTV Player en Windows 11 y Smart TVs)
    epgXmltv: 'https://videm.tv/api/trex?epg=xml',
    epgColombiaUrl: 'https://epgshare01.online/epgshare01/epg_ripper_CO1.xml.gz',
    trexRawEpgXmltv: 'http://line.prim01.com:80/xmltv.php?username=493da0239d&password=69b4dd0ebc7f'
  },

  streamOptions: {
    // 'ts' funciona directamente en MyIPTV Player (Windows 11) y Smart TVs sin fallar en redirecciones 302 relativas;
    // se puede pedir 'hls' (.m3u8) pasando ?output=hls
    defaultFormat: 'ts',
    networkCachingMs: 3000,
    httpReconnect: true
  },

  userAgent: 'TiviMate/4.7.0',
  cacheTtlMs: 30 * 60 * 1000, // 30 minutos de caché en memoria

  // Categorías relevantes en el servidor TREX
  categories: {
    '154': 'LAT| COLOMBIA',
    '151': 'LAT| MEXICO',
    '152': 'LAT| ARGENTINA',
    '166': 'LAT| CULTURA / DOCU',
    '2171': 'LAT| MEXICO VIP',
    '2368': 'LAT| VIX PPV',
    '1667': 'LAT| DEPORTES / VARIOS',
    '1334': 'SPORTS EVENTS'
  },

  // Logos oficiales verificados (CDN Telefónica/Movistar Colombia GVP) y mapeo EDT/EPG
  // Corrige picons erróneos de TREX (ej. ID 145416 Win Sports+ que traía el logo francés de Infosport+)
  channelCatalog: [
    {
      match: /\b(WIN\s*SPORTS\s*PLUS|WIN\s*SPORTS\s*\+|WINSPORTS\s*1|WINSPOETS\s*2|WINSPOETS\s*3)\b/i,
      epgId: 'Win.Sports+.co',
      logo: `${GVP_BASE}/00/06/50/6502118_A3D837B2E9C01F60.png`
    },
    {
      match: /\b(WIN\s*SPORTS|WINSPORTS)\b/i,
      epgId: 'Win.Sports.co',
      logo: `${GVP_BASE}/00/06/73/6737707_F9A7AE02A016370E.png`
    },
    {
      match: /\bCARACOL\b/i,
      epgId: 'Caracol.co',
      logo: `${GVP_BASE}/00/06/77/6777674_523AE0ED0219820E.png`
    },
    {
      match: /\bRCN\s*NOVELAS\b/i,
      epgId: 'RCN.Novelas.co',
      logo: 'http://103.176.90.118/picons/logos/RCN-NOVELAS.png'
    },
    {
      match: /\bRCN\b/i,
      epgId: 'RCN.co',
      logo: `${GVP_BASE}/00/06/72/6726442_FFF4DE2DAA79BEBE.png`
    },
    {
      match: /\b(CANAL\s*UNO|CANAL\s*1)\b/i,
      epgId: 'Canal.1.co',
      logo: `${GVP_BASE}/00/06/73/6735849_E3E120BD5125A1BB.png`
    },
    {
      match: /\bCITY\s*TV\b/i,
      epgId: 'City.TV.co',
      logo: `${GVP_BASE}/00/06/76/6766261_1A203E4D298185B0.png`
    },
    {
      match: /\b(SENAL\s*COLOMBIA|SEÑAL\s*COLOMBIA|SENAL\s*HD)\b/i,
      epgId: 'Señal.Colombia.co',
      logo: `${GVP_BASE}/00/06/77/6777668_306F5814B8C4F4D0.png`
    },
    {
      match: /\bCANAL\s*CAPITAL\b/i,
      epgId: 'Canal.Capital.co',
      logo: `${GVP_BASE}/00/06/84/6840718_06DF1DE82185646C.png`
    },
    {
      match: /\bCANAL\s*TRECE\b/i,
      epgId: 'Canal.Trece.co',
      logo: `${GVP_BASE}/00/06/76/6766259_EF1557DB7D3B4F8E.png`
    },
    {
      match: /\bCANAL\s*TRO\b/i,
      epgId: 'Canal.TRO.co',
      logo: `${GVP_BASE}/00/06/76/6766257_49048E2F6B098025.png`
    },
    {
      match: /\b(TELEANTIOQUIA|TELEANTOQUIA)\b/i,
      epgId: 'Teleantioquia.co',
      logo: `${GVP_BASE}/00/06/73/6737703_74477722C5CA4FB8.png`
    },
    {
      match: /\bTELEMEDELLIN\b/i,
      epgId: 'TELEMEDELLIN.co',
      logo: `${GVP_BASE}/00/08/21/8215975_267320FD9179DB06.png`
    },
    {
      match: /\bTELEPACIFICO\b/i,
      epgId: 'Telepacifico.co',
      logo: `${GVP_BASE}/00/06/77/6777672_498DFB24EDD741CF.png`
    },
    {
      match: /\bTELEISLAS\b/i,
      epgId: 'Teleislas.co',
      logo: `${GVP_BASE}/00/06/77/6777666_C276C345F6941321.png`
    },
    {
      match: /\b(CABLE\s*NOTICIAS|CABLENOTICIAS)\b/i,
      epgId: 'CableNoticias.co',
      logo: `${GVP_BASE}/00/06/73/6737705_3275EC62B4CD9DFE.png`
    },
    {
      match: /\bNTN\s*24\b/i,
      epgId: 'NTN24.co',
      logo: `${GVP_BASE}/00/06/76/6766263_EF18A52021D069F6.png`
    },
    {
      match: /\b(INVESTIGATION\s*DISCOVERY|DISCOVERY\s*ID|\bID\s*HD\b)\b/i,
      epgId: 'ID.-.Investigation.Discovery.co',
      logo: `${GVP_BASE}/00/07/52/7522973_D23BD84A0800ADB3.png`
    },
    {
      match: /\bESPN\s*7\b/i,
      epgId: 'ESPN.7.HD.co',
      logo: `${GVP_BASE}/00/18/12/18120543_D5E98ACC166EE489.png`
    },
    {
      match: /\bESPN\s*6\b/i,
      epgId: 'ESPN.6.HD.co',
      logo: `${GVP_BASE}/00/18/12/18120541_B7604BB1E7F6FE82.png`
    },
    {
      match: /\bESPN\s*5\b/i,
      epgId: 'ESPN.5.co',
      logo: `${GVP_BASE}/00/18/12/18120539_C879B6958D9AC767.png`
    },
    {
      match: /\bESPN\s*4\b/i,
      epgId: 'ESPN.4.co',
      logo: `${GVP_BASE}/00/18/12/18120553_3F72D79C84E760F5.png`
    },
    {
      match: /\bESPN\s*3\b/i,
      epgId: 'ESPN.3.co',
      logo: `${GVP_BASE}/00/04/19/4198159_B5DE0073541D8808.png`
    },
    {
      match: /\bESPN\s*2\b/i,
      epgId: 'ESPN.2.co',
      logo: `${GVP_BASE}/00/06/51/6512316_AA8FA81542C172F3.png`
    },
    {
      match: /\bESPN\b/i,
      epgId: 'ESPN.co',
      logo: `${GVP_BASE}/00/04/19/4198140_99108D7568AA9AAE.png`
    },
    {
      match: /\b(DIRECTV\s*SPORTS\s*2|DSPORTS\s*2)\b/i,
      epgId: 'DSPORTS.2.HD(DTV2HD).co',
      logo: null
    },
    {
      match: /\b(DIRECTV\s*SPORTS|DSPORTS)\b/i,
      epgId: 'DSPORTS.HD.(COL)(DTSCHD).co',
      logo: null
    },
    {
      match: /\bHBO\s*2\b/i,
      epgId: 'HBO.2.co',
      logo: `${GVP_BASE}/00/06/51/6519371_95895B596B5C8566.png`
    },
    {
      match: /\bHBO\s*FAMILY\b/i,
      epgId: 'HBO.Family.co',
      logo: `${GVP_BASE}/00/08/55/8553112_DD5F4931A18250EE.png`
    },
    {
      match: /\bHBO\s*POP\b/i,
      epgId: 'HBO.POP.co',
      logo: `${GVP_BASE}/00/06/57/6576554_D50CDAAE95539E82.png`
    },
    {
      match: /\bHBO\s*XTREME\b/i,
      epgId: 'HBO.XTREME.co',
      logo: `${GVP_BASE}/00/06/57/6576354_680306081B40EE38.png`
    },
    {
      match: /\bHBO\b/i,
      epgId: 'HBO.co',
      logo: `${GVP_BASE}/00/06/51/6519370_43816C0D37A55C34.png`
    },
    {
      match: /\bCINECANAL\b/i,
      epgId: 'Cinecanal.co',
      logo: `${GVP_BASE}/00/06/51/6512486_A3E2583BEF3E7D10.png`
    },
    {
      match: /\bTNT\s*SERIES\b/i,
      epgId: 'TNT.Series.co',
      logo: `${GVP_BASE}/00/06/51/6515476_805DDBBB18788395.png`
    },
    {
      match: /\bTNT\b/i,
      epgId: 'TNT.co',
      logo: `${GVP_BASE}/00/06/51/6515391_CB25EB7CDA76FB24.png`
    },
    {
      match: /\bSPACE\b/i,
      epgId: 'Space.co',
      logo: `${GVP_BASE}/00/06/51/6515394_45E57EEB6C610D30.png`
    },
    {
      match: /\bWARNER\b/i,
      epgId: 'Warner.Channel.co',
      logo: `${GVP_BASE}/00/06/51/6515477_3BB7C82967F46BD5.png`
    },
    {
      match: /\bSTUDIO\s*UNIVERSAL\b/i,
      epgId: 'Studio.Universal.co',
      logo: `${GVP_BASE}/00/06/08/6088301_9018F0C267867285.png`
    },
    {
      match: /\bUNIVERSAL\b/i,
      epgId: 'Universal.TV.co',
      logo: `${GVP_BASE}/00/06/51/6519095_678CDFE242981C69.png`
    },
    {
      match: /\bSTAR\s*CHANNEL\b/i,
      epgId: 'STAR.CHANNEL.co',
      logo: `${GVP_BASE}/00/08/35/8355168_71322F74BDD910DD.png`
    },
    {
      match: /\bSONY\b/i,
      epgId: 'Sony.co',
      logo: `${GVP_BASE}/00/06/51/6519094_D25BA55CD778E9BC.png`
    },
    {
      match: /\bAXN\b/i,
      epgId: 'AXN.co',
      logo: `${GVP_BASE}/00/06/51/6518947_CDE896912C494ADE.png`
    },
    {
      match: /\bPARAMOUNT\b/i,
      epgId: 'Paramount.Channel.co',
      logo: `${GVP_BASE}/00/06/84/6840721_AEB0D89DD5B9FA4C.png`
    },
    {
      match: /\bDISCOVERY\s*KIDS\b/i,
      epgId: 'Discovery.Kids.co',
      logo: `${GVP_BASE}/00/06/52/6523293_350A81601DFB7D0D.png`
    },
    {
      match: /\bDISCOVERY\s*TURBO\b/i,
      epgId: 'Discovery.Turbo.co',
      logo: `${GVP_BASE}/00/06/51/6512491_2CE2F46FEA087030.png`
    },
    {
      match: /\bDISCOVERY\s*H&H|DISCOVERY\s*HOME\b/i,
      epgId: 'Discovery.H&amp;H.co',
      logo: `${GVP_BASE}/00/11/47/11470350_2B54A1C94E8999B4.png`
    },
    {
      match: /\bDISCOVERY\b/i,
      epgId: 'Discovery.Channel.co',
      logo: `${GVP_BASE}/00/06/52/6523534_45AEC952162CBFB0.png`
    },
    {
      match: /\bHISTORY\s*2|H2\b/i,
      epgId: 'History.2.co',
      logo: `${GVP_BASE}/00/10/55/10556455_1534264D9C0B8BFC.png`
    },
    {
      match: /\bHISTORY\b/i,
      epgId: 'History.Channel.co',
      logo: `${GVP_BASE}/00/10/55/10556450_C3E849D2CEA2997D.png`
    },
    {
      match: /\b(NATIONAL\s*GEO|NAT\s*GEO)\b/i,
      epgId: 'National.Geographic.co',
      logo: `${GVP_BASE}/00/06/52/6523538_ED18BE0D9CB65652.png`
    },
    {
      match: /\bANIMAL\s*PLANET\b/i,
      epgId: 'Animal.Planet.co',
      logo: `${GVP_BASE}/00/06/52/6523540_26F81A3F46EA5552.png`
    },
    {
      match: /\bTLC\b/i,
      epgId: 'TLC.co',
      logo: `${GVP_BASE}/00/06/52/6523672_50C8A6C8B9DD42A3.png`
    },
    {
      match: /\bCARTOON\s*NETWORK\b/i,
      epgId: 'Cartoon.Network.co',
      logo: `${GVP_BASE}/00/06/52/6523297_AC1C9C4372225AAB.png`
    },
    {
      match: /\bDISNEY\s*JUNIOR\b/i,
      epgId: 'DISNEY.JUNIOR.co',
      logo: `${GVP_BASE}/00/06/52/6523291_F6DF039E3B8E8BB1.png`
    },
    {
      match: /\bDISNEY\b/i,
      epgId: 'Disney.Channel.co',
      logo: `${GVP_BASE}/00/06/52/6523290_AD350A44EE3C7F22.png`
    },
    {
      match: /\bNICK\s*JR\b/i,
      epgId: 'Nick.Jr.co',
      logo: `${GVP_BASE}/00/06/52/6523299_3D2D15D8014926D6.png`
    },
    {
      match: /\b(NICKELODEON|\bNICK\b)\b/i,
      epgId: 'Nick.co',
      logo: `${GVP_BASE}/00/06/52/6523298_5E05A48FF212BDA3.png`
    }
  ]
};
