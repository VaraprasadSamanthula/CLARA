/**
 * Data Cleaning Pipeline Configuration
 * Defines transformation rules for each table
 */

module.exports = {
  // Global transformation settings
  global: {
    nullRepresentations: ['', 'NULL', 'null', 'nan', 'NaN', 'N/A', 'n/a'],
    dateFormats: ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.SSSZ'],
    outputDateFormat: 'YYYY-MM-DD HH:mm:ss',
    trimWhitespace: true,
    normalizeCase: true,
    validateForeignKeys: true,
    deduplicateRecords: false
  },

  // Table-specific schemas and transformation rules
  tables: {
    'patients.csv': {
      category: 'hosp',
      priority: 1,
      columns: {
        subject_id: { type: 'INTEGER', nullable: false, trim: false },
        gender: { type: 'TEXT', nullable: false, trim: true, lowercase: true },
        anchor_age: { type: 'INTEGER', nullable: false },
        anchor_year: { type: 'INTEGER', nullable: false },
        anchor_year_group: { type: 'TEXT', nullable: false, trim: true },
        dod: { type: 'DATETIME', nullable: true }
      },
      primaryKey: ['subject_id'],
      foreignKeys: [],
      issues: ['69% null values in dod (expected)'],
      transformer: 'standard'
    },

    'admissions.csv': {
      category: 'hosp',
      priority: 2,
      columns: {
        hadm_id: { type: 'INTEGER', nullable: false, trim: false },
        subject_id: { type: 'INTEGER', nullable: false, trim: false },
        admittime: { type: 'DATETIME', nullable: false },
        dischtime: { type: 'DATETIME', nullable: true },
        deathtime: { type: 'DATETIME', nullable: true },
        admission_type: { type: 'TEXT', nullable: false, trim: true },
        admit_provider_id: { type: 'INTEGER', nullable: true },
        admission_location: { type: 'TEXT', nullable: true, trim: true },
        discharge_location: { type: 'TEXT', nullable: true, trim: true },
        insurance: { type: 'TEXT', nullable: true, trim: true },
        language: { type: 'TEXT', nullable: true, trim: true },
        marital_status: { type: 'TEXT', nullable: true, trim: true },
        race: { type: 'TEXT', nullable: true, trim: true },
        edregtime: { type: 'DATETIME', nullable: true },
        edouttime: { type: 'DATETIME', nullable: true },
        hospital_expire_flag: { type: 'INTEGER', nullable: false }
      },
      primaryKey: ['hadm_id'],
      foreignKeys: [
        { column: 'subject_id', references: 'patients.csv:subject_id' }
      ],
      transformer: 'standard'
    },

    'prescriptions.csv': {
      category: 'hosp',
      priority: 3,
      columns: {
        subject_id: { type: 'INTEGER', nullable: false },
        hadm_id: { type: 'INTEGER', nullable: true },
        pharmacy_id: { type: 'INTEGER', nullable: true },
        poe_id: { type: 'INTEGER', nullable: true },
        poe_seq: { type: 'INTEGER', nullable: true },
        order_provider_id: { type: 'INTEGER', nullable: true },
        starttime: { type: 'DATETIME', nullable: true },
        stoptime: { type: 'DATETIME', nullable: true },
        drug_type: { type: 'TEXT', nullable: true, trim: true },
        drug: { type: 'TEXT', nullable: false, trim: true },
        formulary_drug_cd: { type: 'TEXT', nullable: true, trim: true },
        gsn: { type: 'TEXT', nullable: true, trim: true },
        ndc: { type: 'TEXT', nullable: true, trim: true },
        prod_strength: { type: 'TEXT', nullable: true, trim: true },
        form_rx: { type: 'TEXT', nullable: true, trim: true },
        dose_val_rx: { type: 'FLOAT', nullable: true },
        dose_unit_rx: { type: 'TEXT', nullable: true, trim: true },
        form_val_disp: { type: 'TEXT', nullable: true, trim: true },
        form_unit_disp: { type: 'TEXT', nullable: true, trim: true },
        doses_per_24_hrs: { type: 'FLOAT', nullable: true },
        route: { type: 'TEXT', nullable: true, trim: true }
      },
      primaryKey: ['subject_id', 'hadm_id', 'poe_seq'],
      foreignKeys: [
        { column: 'subject_id', references: 'patients.csv:subject_id' },
        { column: 'hadm_id', references: 'admissions.csv:hadm_id', nullable: true }
      ],
      transformer: 'drug_normalizer'
    },

    'labevents.csv': {
      category: 'hosp',
      priority: 4,
      columns: {
        labevent_id: { type: 'INTEGER', nullable: false },
        subject_id: { type: 'INTEGER', nullable: false },
        hadm_id: { type: 'INTEGER', nullable: true },
        specimen_id: { type: 'INTEGER', nullable: true },
        itemid: { type: 'INTEGER', nullable: false },
        order_provider_id: { type: 'INTEGER', nullable: true },
        charttime: { type: 'DATETIME', nullable: false },
        storetime: { type: 'DATETIME', nullable: false },
        value: { type: 'TEXT', nullable: true, trim: true },
        valuenum: { type: 'FLOAT', nullable: true },
        valueuom: { type: 'TEXT', nullable: true, trim: true },
        ref_range_lower: { type: 'FLOAT', nullable: true },
        ref_range_upper: { type: 'FLOAT', nullable: true },
        flag: { type: 'TEXT', nullable: true, trim: true, uppercase: true },
        priority: { type: 'TEXT', nullable: true, trim: true },
        comments: { type: 'TEXT', nullable: true, trim: true }
      },
      primaryKey: ['labevent_id'],
      foreignKeys: [
        { column: 'subject_id', references: 'patients.csv:subject_id' },
        { column: 'hadm_id', references: 'admissions.csv:hadm_id', nullable: true },
        { column: 'itemid', references: 'd_labitems.csv:itemid' }
      ],
      transformer: 'lab_normalizer'
    },

    'diagnoses_icd.csv': {
      category: 'hosp',
      priority: 5,
      columns: {
        subject_id: { type: 'INTEGER', nullable: false },
        hadm_id: { type: 'INTEGER', nullable: false },
        seq_num: { type: 'INTEGER', nullable: true },
        icd_code: { type: 'TEXT', nullable: false, trim: true, uppercase: true },
        icd_version: { type: 'INTEGER', nullable: true }
      },
      primaryKey: ['subject_id', 'hadm_id', 'seq_num'],
      foreignKeys: [
        { column: 'subject_id', references: 'patients.csv:subject_id' },
        { column: 'hadm_id', references: 'admissions.csv:hadm_id' },
        { column: 'icd_code', references: 'd_icd_diagnoses.csv:icd_code' }
      ],
      transformer: 'standard'
    },

    'd_labitems.csv': {
      category: 'hosp',
      priority: 10,
      columns: {
        itemid: { type: 'INTEGER', nullable: false },
        label: { type: 'TEXT', nullable: false, trim: true },
        fluid: { type: 'TEXT', nullable: true, trim: true },
        category: { type: 'TEXT', nullable: true, trim: true }
      },
      primaryKey: ['itemid'],
      foreignKeys: [],
      transformer: 'standard'
    },

    'd_icd_diagnoses.csv': {
      category: 'hosp',
      priority: 11,
      columns: {
        icd_code: { type: 'TEXT', nullable: false, trim: true, uppercase: true },
        icd_version: { type: 'INTEGER', nullable: false },
        long_title: { type: 'TEXT', nullable: true, trim: true }
      },
      primaryKey: ['icd_code', 'icd_version'],
      foreignKeys: [],
      transformer: 'standard'
    },

    'icustays.csv': {
      category: 'icu',
      priority: 6,
      columns: {
        subject_id: { type: 'INTEGER', nullable: false },
        hadm_id: { type: 'INTEGER', nullable: false },
        stay_id: { type: 'INTEGER', nullable: false },
        first_careunit: { type: 'TEXT', nullable: true, trim: true },
        last_careunit: { type: 'TEXT', nullable: true, trim: true },
        intime: { type: 'DATETIME', nullable: false },
        outtime: { type: 'DATETIME', nullable: true },
        los: { type: 'FLOAT', nullable: true }
      },
      primaryKey: ['stay_id'],
      foreignKeys: [
        { column: 'subject_id', references: 'patients.csv:subject_id' },
        { column: 'hadm_id', references: 'admissions.csv:hadm_id' }
      ],
      transformer: 'standard'
    },

    'd_items.csv': {
      category: 'icu',
      priority: 12,
      columns: {
        itemid: { type: 'INTEGER', nullable: false },
        label: { type: 'TEXT', nullable: false, trim: true },
        abbreviation: { type: 'TEXT', nullable: true, trim: true },
        linksto: { type: 'TEXT', nullable: true, trim: true },
        category: { type: 'TEXT', nullable: true, trim: true },
        unitname: { type: 'TEXT', nullable: true, trim: true },
        param_type: { type: 'TEXT', nullable: true, trim: true },
        lownormalvalue: { type: 'FLOAT', nullable: true },
        highnormalvalue: { type: 'FLOAT', nullable: true }
      },
      primaryKey: ['itemid'],
      foreignKeys: [],
      transformer: 'standard'
    }
  },

  // Phase 2 scope: Start with high-impact tables
  phase2Scope: [
    'patients.csv',
    'admissions.csv',
    'prescriptions.csv',
    'labevents.csv',
    'diagnoses_icd.csv',
    'd_labitems.csv',
    'd_icd_diagnoses.csv',
    'icustays.csv',
    'd_items.csv'
  ],

  // Validation rules
  validation: {
    dateFields: ['admittime', 'dischtime', 'deathtime', 'charttime', 'starttime', 'stoptime', 'intime', 'outtime', 'edregtime', 'edouttime'],
    idFields: ['subject_id', 'hadm_id', 'stay_id', 'labevent_id', 'itemid', 'pharmacy_id'],
    numericFields: ['age', 'valuenum', 'ref_range_lower', 'ref_range_upper', 'dose_val_rx', 'doses_per_24_hrs', 'los'],
    flagOnMismatch: true,
    maxNullPercentage: 50 // Warn if > 50%
  }
};
