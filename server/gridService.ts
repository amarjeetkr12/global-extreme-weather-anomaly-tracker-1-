import { GridCell, GridCellBounds } from '../src/types.ts';

export const INDIA_MONITORING_NODES = [
  { name: 'New Delhi (NCR)', lat: 28.6139, lon: 77.2090, state: 'Delhi' },
  { name: 'Mumbai (Konkan Coast)', lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  { name: 'Kolkata (Bengal Coast)', lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  { name: 'Chennai (Coromandel Coast)', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  { name: 'Bengaluru (Deccan Plateau)', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { name: 'Hyderabad (Telangana)', lat: 17.3850, lon: 78.4867, state: 'Telangana' },
  { name: 'Ahmedabad (Gujarat)', lat: 23.0225, lon: 72.5714, state: 'Gujarat' },
  { name: 'Pune (Western Ghats)', lat: 18.5204, lon: 73.8567, state: 'Maharashtra' },
  { name: 'Jaipur (Thar Fringe)', lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  { name: 'Lucknow (Gangetic Plains)', lat: 26.8467, lon: 80.9462, state: 'Uttar Pradesh' },
  { name: 'Bhubaneswar (Odisha Coast)', lat: 20.2961, lon: 85.8245, state: 'Odisha' },
  { name: 'Visakhapatnam (Andhra Coast)', lat: 17.6868, lon: 83.2185, state: 'Andhra Pradesh' },
  { name: 'Kochi (Malabar Coast)', lat: 9.9312, lon: 76.2673, state: 'Kerala' },
  { name: 'Guwahati (Brahmaputra Valley)', lat: 26.1445, lon: 91.7362, state: 'Assam' },
  { name: 'Shimla (Western Himalayas)', lat: 31.1048, lon: 77.1734, state: 'Himachal Pradesh' },
  { name: 'Srinagar (Kashmir Valley)', lat: 34.0837, lon: 74.7973, state: 'Jammu & Kashmir' },
  { name: 'Thiruvananthapuram (South Tip)', lat: 8.5241, lon: 76.9366, state: 'Kerala' },
  { name: 'Patna (Middle Ganga)', lat: 25.5941, lon: 85.1376, state: 'Bihar' },
  { name: 'Bhopal (Central Highlands)', lat: 23.2599, lon: 77.4126, state: 'Madhya Pradesh' },
  { name: 'Ranchi (Chota Nagpur)', lat: 23.3441, lon: 85.3096, state: 'Jharkhand' },
  { name: 'Dehradun (Garhwal Foothills)', lat: 30.3165, lon: 78.0322, state: 'Uttarakhand' },
  { name: 'Panaji (Goa Coast)', lat: 15.4909, lon: 73.8278, state: 'Goa' },
  { name: 'Port Blair (Andaman Islands)', lat: 11.6234, lon: 92.7265, state: 'Andaman & Nicobar' },
  { name: 'Kavaratti (Lakshadweep)', lat: 10.5667, lon: 72.6417, state: 'Lakshadweep' },
  { name: 'Agartala (Northeast Fringe)', lat: 23.8315, lon: 91.2868, state: 'Tripura' },
  { name: 'Imphal (Manipur Basin)', lat: 24.8170, lon: 93.9368, state: 'Manipur' },
  { name: 'Shillong (Meghalaya Plateau)', lat: 25.5788, lon: 91.8933, state: 'Meghalaya' },
  { name: 'Nagpur (Central India)', lat: 21.1458, lon: 79.0882, state: 'Maharashtra' },
];

export function formatCoordinate(val: number): string {
  const rounded = Math.round(val * 100) / 100;
  return rounded.toFixed(2);
}

export function generateCellId(lat: number, lon: number): string {
  const latPrefix = lat >= 0 ? 'N' : 'S';
  const lonPrefix = lon >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);
  return `CELL_${latPrefix}${formatCoordinate(absLat)}_${lonPrefix}${formatCoordinate(absLon)}`;
}

export function calculateCellBounds(lat: number, lon: number, resolution: number): GridCellBounds {
  const halfStep = resolution / 2;
  const north = Math.min(90, Math.round((lat + halfStep) * 100) / 100);
  const south = Math.max(-90, Math.round((lat - halfStep) * 100) / 100);
  let east = lon + halfStep;
  let west = lon - halfStep;
  if (east > 180) east = 180;
  if (west < -180) west = -180;
  return {
    north,
    south,
    east: Math.round(east * 100) / 100,
    west: Math.round(west * 100) / 100,
  };
}

export class GlobalGridService {
  private cachedGlobalCells: GridCell[] = [];
  private cachedIndiaNodes: GridCell[] = [];

  constructor() {
    this.initGrids();
  }

  private initGrids() {
    // 1. Build exactly 703 Global Monitoring Cells (Standard 10-degree global sphere mesh)
    const gCells: GridCell[] = [];
    const seen = new Set<string>();

    // Step across globe: 19 latitude bands x 37 longitude cuts = 703 monitoring cells
    for (let lat = -90; lat <= 90; lat += 10) {
      const normLat = Math.round(lat * 100) / 100;
      for (let lon = -180; lon <= 180; lon += 10) {
        const normLon = Math.round(lon * 100) / 100;
        const id = generateCellId(normLat, normLon);
        if (!seen.has(id)) {
          seen.add(id);
          gCells.push({
            cell_id: id,
            lat: normLat,
            lon: normLon,
            resolution: 10,
            region: 'GLOBAL',
            bounds: calculateCellBounds(normLat, normLon, 10),
          });
        }
      }
    }
    this.cachedGlobalCells = gCells;

    // 2. Build exactly 28 India Monitoring Nodes (first-class high-density nodal sensors)
    this.cachedIndiaNodes = INDIA_MONITORING_NODES.map((node) => {
      const id = `NODE_IND_${generateCellId(node.lat, node.lon).replace('CELL_', '')}`;
      return {
        cell_id: id,
        lat: node.lat,
        lon: node.lon,
        resolution: 2.5,
        region: 'INDIA' as const,
        node_name: `${node.name}, ${node.state}`,
        bounds: calculateCellBounds(node.lat, node.lon, 2.5),
      };
    });
  }

  public getGlobalCells(): GridCell[] {
    return this.cachedGlobalCells;
  }

  public getIndiaNodes(): GridCell[] {
    return this.cachedIndiaNodes;
  }

  public getAllCells(): GridCell[] {
    return [...this.cachedGlobalCells, ...this.cachedIndiaNodes];
  }

  public getGridByRegion(region: 'ALL' | 'GLOBAL' | 'INDIA' = 'ALL'): GridCell[] {
    if (region === 'GLOBAL') return this.cachedGlobalCells;
    if (region === 'INDIA') return this.cachedIndiaNodes;
    return this.getAllCells();
  }

  public findNearestCell(lat: number, lon: number): GridCell {
    let bestDist = Infinity;
    let bestCell = this.cachedGlobalCells[0];

    const all = this.getAllCells();
    for (const cell of all) {
      // Euclidean proxy for fast lookup
      const dLat = cell.lat - lat;
      const dLon = cell.lon - lon;
      const dist = dLat * dLat + dLon * dLon;
      if (dist < bestDist) {
        bestDist = dist;
        bestCell = cell;
      }
    }
    return bestCell;
  }

  public getCellById(cellId: string): GridCell | null {
    const found = this.getAllCells().find((c) => c.cell_id === cellId);
    return found || null;
  }
}

export const globalGridService = new GlobalGridService();
