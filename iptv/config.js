/**
 * CONFIGURACIÓN MAESTRA INDEPENDIENTE - TREX IPTV (PLAN 90 DÍAS)
 * Este módulo centraliza las credenciales, fechas de contrato, categorías y reglas
 * de la parrilla IPTV, 100% separado de la operación de VIDEM (Stremio / Real-Debrid).
 */

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
    epgXmltv: 'http://line.prim01.com:80/xmltv.php?username=493da0239d&password=69b4dd0ebc7f'
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
  }
};
