import { db } from './connection';
import { initializeDatabase } from './schema';
import { ApplicationInput, BranchInput, CustomerInput } from '../types/database.types';

// Distinct Dataset 1: Applications by Month & Business Segment
export const SEED_APPLICATIONS: ApplicationInput[] = [
  // 2025 Q1
  { month: '2025-01', segment: 'Retail', count: 1840 },
  { month: '2025-01', segment: 'SME', count: 420 },
  { month: '2025-01', segment: 'Corporate', count: 65 },
  { month: '2025-01', segment: 'Wealth Management', count: 110 },
  { month: '2025-01', segment: 'Agriculture', count: 145 },

  { month: '2025-02', segment: 'Retail', count: 1920 },
  { month: '2025-02', segment: 'SME', count: 460 },
  { month: '2025-02', segment: 'Corporate', count: 72 },
  { month: '2025-02', segment: 'Wealth Management', count: 125 },
  { month: '2025-02', segment: 'Agriculture', count: 160 },

  { month: '2025-03', segment: 'Retail', count: 2150 },
  { month: '2025-03', segment: 'SME', count: 510 },
  { month: '2025-03', segment: 'Corporate', count: 88 },
  { month: '2025-03', segment: 'Wealth Management', count: 140 },
  { month: '2025-03', segment: 'Agriculture', count: 210 },

  // 2025 Q2
  { month: '2025-04', segment: 'Retail', count: 2040 },
  { month: '2025-04', segment: 'SME', count: 495 },
  { month: '2025-04', segment: 'Corporate', count: 80 },
  { month: '2025-04', segment: 'Wealth Management', count: 135 },
  { month: '2025-04', segment: 'Agriculture', count: 275 },

  { month: '2025-05', segment: 'Retail', count: 2280 },
  { month: '2025-05', segment: 'SME', count: 540 },
  { month: '2025-05', segment: 'Corporate', count: 92 },
  { month: '2025-05', segment: 'Wealth Management', count: 155 },
  { month: '2025-05', segment: 'Agriculture', count: 290 },

  { month: '2025-06', segment: 'Retail', count: 2410 },
  { month: '2025-06', segment: 'SME', count: 590 },
  { month: '2025-06', segment: 'Corporate', count: 104 },
  { month: '2025-06', segment: 'Wealth Management', count: 168 },
  { month: '2025-06', segment: 'Agriculture', count: 230 },

  // 2025 Q3
  { month: '2025-07', segment: 'Retail', count: 2350 },
  { month: '2025-07', segment: 'SME', count: 565 },
  { month: '2025-07', segment: 'Corporate', count: 98 },
  { month: '2025-07', segment: 'Wealth Management', count: 160 },
  { month: '2025-07', segment: 'Agriculture', count: 185 },

  { month: '2025-08', segment: 'Retail', count: 2290 },
  { month: '2025-08', segment: 'SME', count: 530 },
  { month: '2025-08', segment: 'Corporate', count: 89 },
  { month: '2025-08', segment: 'Wealth Management', count: 150 },
  { month: '2025-08', segment: 'Agriculture', count: 170 },

  { month: '2025-09', segment: 'Retail', count: 2490 },
  { month: '2025-09', segment: 'SME', count: 620 },
  { month: '2025-09', segment: 'Corporate', count: 112 },
  { month: '2025-09', segment: 'Wealth Management', count: 180 },
  { month: '2025-09', segment: 'Agriculture', count: 225 },

  // 2025 Q4
  { month: '2025-10', segment: 'Retail', count: 2620 },
  { month: '2025-10', segment: 'SME', count: 675 },
  { month: '2025-10', segment: 'Corporate', count: 124 },
  { month: '2025-10', segment: 'Wealth Management', count: 195 },
  { month: '2025-10', segment: 'Agriculture', count: 250 },

  { month: '2025-11', segment: 'Retail', count: 2780 },
  { month: '2025-11', segment: 'SME', count: 710 },
  { month: '2025-11', segment: 'Corporate', count: 135 },
  { month: '2025-11', segment: 'Wealth Management', count: 215 },
  { month: '2025-11', segment: 'Agriculture', count: 210 },

  { month: '2025-12', segment: 'Retail', count: 2950 },
  { month: '2025-12', segment: 'SME', count: 760 },
  { month: '2025-12', segment: 'Corporate', count: 148 },
  { month: '2025-12', segment: 'Wealth Management', count: 240 },
  { month: '2025-12', segment: 'Agriculture', count: 195 },

  // 2026 Q1
  { month: '2026-01', segment: 'Retail', count: 2820 },
  { month: '2026-01', segment: 'SME', count: 730 },
  { month: '2026-01', segment: 'Corporate', count: 138 },
  { month: '2026-01', segment: 'Wealth Management', count: 228 },
  { month: '2026-01', segment: 'Agriculture', count: 180 },

  { month: '2026-02', segment: 'Retail', count: 2890 },
  { month: '2026-02', segment: 'SME', count: 755 },
  { month: '2026-02', segment: 'Corporate', count: 144 },
  { month: '2026-02', segment: 'Wealth Management', count: 236 },
  { month: '2026-02', segment: 'Agriculture', count: 190 },

  { month: '2026-03', segment: 'Retail', count: 3110 },
  { month: '2026-03', segment: 'SME', count: 820 },
  { month: '2026-03', segment: 'Corporate', count: 160 },
  { month: '2026-03', segment: 'Wealth Management', count: 260 },
  { month: '2026-03', segment: 'Agriculture', count: 240 },
];

// Distinct Dataset 2: Bank Branches and Credit / Loan Rejection Rates (REAL)
export const SEED_BRANCHES: BranchInput[] = [
  { name: 'Metropolitan Flagship Branch', rejection_rate: 0.042 },
  { name: 'Downtown Financial Center', rejection_rate: 0.068 },
  { name: 'Uptown Private Wealth Hub', rejection_rate: 0.035 },
  { name: 'Tech Park Innovation Branch', rejection_rate: 0.054 },
  { name: 'South District Premier Branch', rejection_rate: 0.076 },
  { name: 'Westside Commercial Branch', rejection_rate: 0.092 },
  { name: 'Midtown Retail Hub', rejection_rate: 0.115 },
  { name: 'Airport Express Center', rejection_rate: 0.128 },
  { name: 'Suburban North Branch', rejection_rate: 0.142 },
  { name: 'Old Quarter Historic Branch', rejection_rate: 0.165 },
  { name: 'Harbor Maritime Commerce', rejection_rate: 0.178 },
  { name: 'Regional Logistics Center Branch', rejection_rate: 0.194 },
  { name: 'East Valley Community Branch', rejection_rate: 0.210 },
  { name: 'Industrial Park Branch', rejection_rate: 0.238 },
  { name: 'University Campus Branch', rejection_rate: 0.274 },
];

// Distinct Dataset 3: Bank Customers and Cumulative Transaction Value (REAL)
export const SEED_CUSTOMERS: CustomerInput[] = [
  // Enterprise & Institutional Clients
  { name: 'Apex Global Logistics LLC', transaction_value: 14850250.75 },
  { name: 'Nexus Cloud Infrastructure Corp', transaction_value: 11200400.00 },
  { name: 'Vanguard Renewable Energy Ltd', transaction_value: 9450000.50 },
  { name: 'Pinnacle Health Systems', transaction_value: 7820300.25 },
  { name: 'Quantum Semiconductor Inc', transaction_value: 6940150.00 },
  { name: 'Aegis Aerospace Group', transaction_value: 5750000.00 },
  { name: 'Summit Asset Management', transaction_value: 4890600.80 },

  // Commercial & SME Accounts
  { name: 'Crestview Medical Supplies', transaction_value: 1650000.00 },
  { name: 'Beacon Maritime Services', transaction_value: 1240800.50 },
  { name: 'Solaria Solar Solutions', transaction_value: 980500.00 },
  { name: 'Horizon Craft Distillers', transaction_value: 745200.25 },
  { name: 'Urban Green Retailers Ltd', transaction_value: 620400.00 },
  { name: 'Trident Precision Tooling', transaction_value: 535100.75 },
  { name: 'Veritas Analytics Group', transaction_value: 480900.00 },
  { name: 'Starlight Hospitality Partners', transaction_value: 412300.00 },
  { name: 'Evergreen Organic Farms Co', transaction_value: 365800.50 },

  // High-Net-Worth & Private Wealth Individuals
  { name: 'Dr. Eleanor Vance', transaction_value: 385000.00 },
  { name: 'Marcus Sterling', transaction_value: 295400.50 },
  { name: 'Elena Rostova', transaction_value: 215600.00 },
  { name: 'Arthur Pendelton III', transaction_value: 184500.25 },
  { name: 'Dr. Hiroshi Tanaka', transaction_value: 162000.00 },
  { name: 'Chloe Davenport', transaction_value: 145800.00 },

  // Retail & Consumer Clients
  { name: 'Jonathan Reed', transaction_value: 86400.75 },
  { name: 'Sofia Martinez', transaction_value: 64200.00 },
  { name: 'David Kim', transaction_value: 49800.50 },
  { name: 'Amina Al-Mansoor', transaction_value: 38250.00 },
  { name: 'Lucas Rossi', transaction_value: 27900.25 },
  { name: 'Clara Dubois', transaction_value: 19850.00 },
  { name: 'Tariq O’Connor', transaction_value: 14320.00 },
  { name: 'Zoe Chen', transaction_value: 8950.50 },
];

/**
 * Populates banking.db with the three distinct datasets inside an atomic transaction
 */
export async function seedDatabase(options: { reset?: boolean } = { reset: true }): Promise<{
  applicationsInserted: number;
  branchesInserted: number;
  customersInserted: number;
}> {
  console.log('[Seed] Starting database seeding process...');

  // Ensure tables exist before seeding
  await initializeDatabase();

  const counts = await db.transaction(async () => {
    if (options.reset) {
      console.log('[Seed] Clearing existing records from applications, branches, and customers...');
      await db.run('DELETE FROM applications;');
      await db.run('DELETE FROM branches;');
      await db.run('DELETE FROM customers;');
      await db.run('DELETE FROM sqlite_sequence WHERE name IN ("applications", "branches", "customers");');
    }

    // 1. Seed applications
    console.log(`[Seed] Inserting ${SEED_APPLICATIONS.length} application records...`);
    for (const app of SEED_APPLICATIONS) {
      await db.run(
        'INSERT INTO applications (month, segment, count) VALUES (?, ?, ?);',
        [app.month, app.segment, app.count]
      );
    }

    // 2. Seed branches
    console.log(`[Seed] Inserting ${SEED_BRANCHES.length} branch records...`);
    for (const branch of SEED_BRANCHES) {
      await db.run(
        'INSERT INTO branches (name, rejection_rate) VALUES (?, ?);',
        [branch.name, branch.rejection_rate]
      );
    }

    // 3. Seed customers
    console.log(`[Seed] Inserting ${SEED_CUSTOMERS.length} customer records...`);
    for (const customer of SEED_CUSTOMERS) {
      await db.run(
        'INSERT INTO customers (name, transaction_value) VALUES (?, ?);',
        [customer.name, customer.transaction_value]
      );
    }

    const appCount = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM applications;');
    const branchCount = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM branches;');
    const custCount = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM customers;');

    return {
      applicationsInserted: appCount?.c ?? SEED_APPLICATIONS.length,
      branchesInserted: branchCount?.c ?? SEED_BRANCHES.length,
      customersInserted: custCount?.c ?? SEED_CUSTOMERS.length,
    };
  });

  console.log('--------------------------------------------------');
  console.log(' Seeding Completed Successfully');
  console.log(`   Applications Records : ${counts.applicationsInserted}`);
  console.log(`   Branches Records     : ${counts.branchesInserted}`);
  console.log(`   Customers Records    : ${counts.customersInserted}`);
  console.log('--------------------------------------------------');

  return counts;
}

// Standalone execution wrapper
if (require.main === module || process.argv[1]?.includes('seed')) {
  seedDatabase({ reset: true })
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('[Seed Error] Failed to seed database:', error);
      try {
        await db.close();
      } catch {
        // ignore close error on failure
      }
      process.exit(1);
    });
}
