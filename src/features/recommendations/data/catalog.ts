import type { FeaturedRecommendation, RecommendationCatalogEntry } from '../types/recommendation'

/**
 * Catálogo estático de recomendaciones ergonómicas usado por la página
 * standalone /recommendations mientras el backend no exponga un endpoint de
 * listado completo. Cuando el backend habilite `GET /recommendations` con
 * categoría y estado, este catálogo se reemplaza por la respuesta del API.
 */

export const FEATURED_RECOMMENDATION: FeaturedRecommendation = {
  category: 'lumbar',
  tagline: 'Recomendación del día · basada en tu lumbar',
  title: 'Estiramiento',
  titleEmphasis: 'de cadera flexora.',
  body:
    'Detectamos que tu zona lumbar acumuló 28 minutos de desviación entre las 14:30 y las 16:00. Este estiramiento de 90 segundos relaja el psoas — el principal responsable de inclinaciones pélvicas postprandiales.',
  steps: [
    {
      number: '01',
      body: 'Ponte de pie con los pies separados al ancho de los hombros.',
      meta: 'Tiempo: 5 s',
    },
    {
      number: '02',
      body: 'Da un paso adelante con la pierna izquierda y flexiona la rodilla a 90°.',
      meta: 'Mantener: 25 s',
    },
    {
      number: '03',
      body: 'Empuja la cadera hacia adelante manteniendo el torso recto y la mirada al frente.',
      meta: 'Sentir el estiramiento en el psoas anterior',
    },
    {
      number: '04',
      body: 'Cambia de pierna y repite la misma secuencia.',
      meta: 'Mantener: 25 s',
    },
  ],
}

export const RECOMMENDATION_CATALOG: RecommendationCatalogEntry[] = [
  {
    id: 'lumbar-reclinar',
    number: '№ 02',
    category: 'lumbar',
    title: 'Reclinación lumbar consciente',
    description:
      'Apoya la espalda completamente contra el respaldo durante 60 segundos cada hora.',
    frequencyLabel: '≈ 1 min · 6×/día',
    icon: 'lumbar-slouch',
  },
  {
    id: 'cervical-retract',
    number: '№ 03',
    category: 'cervical',
    title: 'Retracción cervical "doble mentón"',
    description:
      'Lleva el mentón hacia atrás manteniendo la mirada al frente. Repite 10 veces.',
    frequencyLabel: '≈ 30 s · 5×/día',
    icon: 'cervical-retract',
  },
  {
    id: 'monitor-altura',
    number: '№ 04',
    category: 'general',
    title: 'Ajuste de altura del monitor',
    description:
      'El borde superior debe quedar a la altura de tus ojos. Usa una resma de papel si hace falta.',
    frequencyLabel: '≈ 2 min · una vez',
    icon: 'monitor',
  },
  {
    id: 'pausa-activa',
    number: '№ 05',
    category: 'general',
    title: 'Pausa activa de 5 minutos',
    description:
      'Cada 45 min de trabajo continuo, levántate y camina al menos 30 metros.',
    frequencyLabel: 'Aplicada · 11:18',
    applied: true,
    appliedAtLabel: '11:18',
    icon: 'pause',
  },
  {
    id: 'cojin-lumbar',
    number: '№ 06',
    category: 'lumbar',
    title: 'Cojín lumbar de soporte',
    description:
      'Coloca un cojín o toalla enrollada en la curvatura lumbar entre vértebras L1—L5.',
    frequencyLabel: 'uso continuo',
    icon: 'lumbar-cushion',
  },
  {
    id: 'cervical-rotar',
    number: '№ 07',
    category: 'cervical',
    title: 'Rotaciones cervicales suaves',
    description:
      'Gira la cabeza lentamente 5 veces a cada lado. Mantén hombros relajados.',
    frequencyLabel: '≈ 45 s · 4×/día',
    icon: 'cervical-rotate',
  },
  {
    id: 'apoyo-plantar',
    number: '№ 08',
    category: 'general',
    title: 'Apoyo plantar firme',
    description:
      'Asegura que ambos pies toquen el suelo o usa un reposapiés. Rodillas a 90°.',
    frequencyLabel: 'configuración inicial',
    icon: 'foot-support',
  },
  {
    id: 'pelvis-neutra',
    number: '№ 09',
    category: 'lumbar',
    title: 'Pelvis neutra al sentarte',
    description:
      'Empuja los glúteos hacia el respaldo, no resbales hacia el frente del asiento.',
    frequencyLabel: 'cada cambio de postura',
    icon: 'pelvis-neutral',
  },
  {
    id: 'hidratacion',
    number: '№ 10',
    category: 'general',
    title: 'Hidratación frecuente',
    description:
      'Bebe 250ml de agua cada hora. La deshidratación reduce elasticidad muscular.',
    frequencyLabel: '≈ 6—8 vasos / día',
    icon: 'hydration',
  },
]
