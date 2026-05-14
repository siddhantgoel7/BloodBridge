export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export const BLOOD_TYPES: BloodType[] = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

// Donors compatible to give to a recipient blood type
const COMPAT: Record<BloodType, BloodType[]> = {
  'O-':  ['O-'],
  'O+':  ['O-','O+'],
  'A-':  ['O-','A-'],
  'A+':  ['O-','O+','A-','A+'],
  'B-':  ['O-','B-'],
  'B+':  ['O-','O+','B-','B+'],
  'AB-': ['O-','A-','B-','AB-'],
  'AB+': ['O-','O+','A-','A+','B-','B+','AB-','AB+'],
};

export const compatibleDonorTypes = (recipient: BloodType): BloodType[] => COMPAT[recipient];

export const canDonateTo = (donor: BloodType, recipient: BloodType): boolean =>
  COMPAT[recipient].includes(donor);

// Haversine distance in km
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export const urgencyLabel: Record<Urgency, string> = {
  low: 'Routine',
  medium: 'Standard',
  high: 'Urgent',
  critical: 'Critical',
};

export const urgencyClasses: Record<Urgency, string> = {
  low: 'bg-success/10 text-success border-success/20',
  medium: 'bg-primary/10 text-primary border-primary/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-accent/10 text-accent border-accent/30',
};

export const COOLDOWN_DAYS = 56; // standard whole-blood cooldown
export const POINTS_PER_DONATION = 100;
