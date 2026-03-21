// SPPU E&TC Subjects — 2019 Course Pattern (Sem V – VIII)

export const SEMESTERS = [
  {
    sem: 'Semester V',
    accent: 'blue',
    subjects: [
      { label: 'Digital Communication',                   value: 'DC' },
      { label: 'Electromagnetic Field Theory',            value: 'EMFT' },
      { label: 'Database Management',                     value: 'DBMS' },
      { label: 'Microcontrollers',                        value: 'MC' },
      { label: 'Digital Signal Processing (Elec. I)',     value: 'DSP' },
      { label: 'Electronic Measurements (Elec. I)',       value: 'EMEAS' },
      { label: 'Fundamentals of JAVA (Elec. I)',          value: 'FJAVA' },
      { label: 'Computer Networks (Elec. I)',             value: 'CN5' },
    ],
  },
  {
    sem: 'Semester VI',
    accent: 'violet',
    subjects: [
      { label: 'Cellular Networks',                       value: 'CN' },
      { label: 'Project Management',                      value: 'PM' },
      { label: 'Power Devices & Circuits',                value: 'PDC' },
      { label: 'Digital Image Processing (Elec. II)',     value: 'DIP' },
      { label: 'Sensors in Automation (Elec. II)',        value: 'SIA' },
      { label: 'Advanced JAVA (Elec. II)',                value: 'AJAVA' },
      { label: 'Embedded Processors (Elec. II)',          value: 'EP' },
      { label: 'Network Security (Elec. II)',             value: 'NSEC' },
    ],
  },
  {
    sem: 'Semester VII',
    accent: 'emerald',
    subjects: [
      { label: 'Radiation & Microwave Theory',            value: 'RMT' },
      { label: 'VLSI Design and Technology',              value: 'VLSI' },
      { label: 'Cloud Computing',                         value: 'CC' },
      { label: 'Speech Processing (Elec. III)',           value: 'SPROC' },
      { label: 'PLC SCADA & Automation (Elec. III)',      value: 'PLC' },
      { label: 'JavaScript (Elec. III)',                  value: 'JS' },
      { label: 'Embedded & RTOS (Elec. III)',             value: 'RTOS' },
      { label: 'Modernized IoT (Elec. III)',              value: 'MIOT' },
      { label: 'Data Mining (Elec. IV)',                  value: 'DM' },
      { label: 'Electronic Product Development (Elec. IV)', value: 'EPD' },
      { label: 'Deep Learning (Elec. IV)',                value: 'DL' },
      { label: 'Low Power CMOS (Elec. IV)',               value: 'LPC' },
      { label: 'Smart Antennas (Elec. IV)',               value: 'SANT' },
    ],
  },
  {
    sem: 'Semester VIII',
    accent: 'orange',
    subjects: [
      { label: 'Fiber Optic Communication',               value: 'FOC' },
      { label: 'Biomedical Signal Processing (Elec. V)',  value: 'BSP' },
      { label: 'Industrial Drives & Automation (Elec. V)', value: 'IDA' },
      { label: 'Android Development (Elec. V)',           value: 'AND' },
      { label: 'Embedded System Design (Elec. V)',        value: 'ESD' },
      { label: 'Mobile Computing (Elec. V)',              value: 'MOBCOM' },
      { label: 'System on Chip (Elec. VI)',               value: 'SOC' },
      { label: 'Nano Electronics (Elec. VI)',             value: 'NE' },
      { label: 'Remote Sensing (Elec. VI)',               value: 'RS' },
      { label: 'Digital Marketing (Elec. VI)',            value: 'DIGIMKT' },
      { label: 'Open Elective (Elec. VI)',                value: 'OE' },
    ],
  },
]

// Flat lookup: value → { label, accent, sem }
export const SUBJECT_META = Object.fromEntries(
  SEMESTERS.flatMap(s =>
    s.subjects.map(sub => [sub.value, { label: sub.label, accent: s.accent, sem: s.sem }])
  )
)

// Accent-colored active button styles (used by filter rows on PYQs, Notes, etc.)
export const ACCENT_ACTIVE = {
  blue:    'bg-blue-500/15 text-blue-300 border-blue-500/40',
  violet:  'bg-violet-500/15 text-violet-300 border-violet-500/40',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  orange:  'bg-orange-500/15 text-orange-300 border-orange-500/40',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40',
  cyan:    'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  amber:   'bg-amber-500/15 text-amber-300 border-amber-500/40',
}

// All subject codes in semester order for consistent section ordering
export const SEMESTER_ORDER = SEMESTERS.flatMap(s => s.subjects.map(sub => sub.value))
