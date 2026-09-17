/**
 * Seed EduPath database with 30 sample universities across target countries.
 * Run with: bun run db:seed
 */
import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const db = new PrismaClient()

type UniSeed = {
  slug: string
  name: string
  country: string
  city: string
  website: string
  tuitionUsd: number
  livingCostUsd: number
  intlStudentPct: number
  acceptanceRate?: number
  currency: string
  logoUrl?: string
  descriptionEn: string
  descriptionAr: string
  programs: Array<{
    name: string
    degreeLevel: 'bachelor' | 'master' | 'phd'
    field: string
    durationMonths: number
    language: string
    tuitionUsd: number
    deadline?: string
    entryReqs?: string
  }>
  scholarships: Array<{
    name: string
    amountUsd: number
    amountType: 'full' | 'partial' | 'fixed'
    eligibility: string
    deadline?: string
  }>
}

const universities: UniSeed[] = [
  // ===== United Kingdom (post-92, affordable) =====
  {
    slug: 'coventry-university',
    name: 'Coventry University',
    country: 'United Kingdom',
    city: 'Coventry',
    website: 'https://www.coventry.ac.uk',
    tuitionUsd: 19500,
    livingCostUsd: 12000,
    intlStudentPct: 38,
    acceptanceRate: 32,
    currency: 'GBP',
    descriptionEn: 'A modern post-92 university with strong industry links and affordable tuition for international students. Known for automotive engineering, business, and digital media programs.',
    descriptionAr: 'جامعة حديثة تأسست بعد عام 1992 مع روابط قوية مع الصناعة ورسوم دراسية معقولة للطلاب الدوليين. معروفة ببرامج الهندسة automotive والأعمال والإعلام الرقمي.',
    programs: [
      { name: 'BSc Automotive Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 36, language: 'English', tuitionUsd: 19500, deadline: '2026-06-30', entryReqs: 'IELTS 6.0, Math + Physics A-levels' },
      { name: 'BSc Business Management', degreeLevel: 'bachelor', field: 'Business', durationMonths: 36, language: 'English', tuitionUsd: 18500, deadline: '2026-06-30' },
      { name: 'MSc Data Science', degreeLevel: 'master', field: 'Computer Science', durationMonths: 12, language: 'English', tuitionUsd: 21000, deadline: '2026-08-15' },
    ],
    scholarships: [
      { name: 'Coventry International Scholarship', amountUsd: 3000, amountType: 'partial', eligibility: 'International students with GPA 3.0+', deadline: '2026-05-01' },
      { name: 'Global Leaders Scholarship', amountUsd: 5000, amountType: 'partial', eligibility: 'Outstanding academic record + leadership essay', deadline: '2026-04-15' },
    ],
  },
  {
    slug: 'middlesex-university-london',
    name: 'Middlesex University London',
    country: 'United Kingdom',
    city: 'London',
    website: 'https://www.mdx.ac.uk',
    tuitionUsd: 17500,
    livingCostUsd: 18000,
    intlStudentPct: 42,
    acceptanceRate: 45,
    currency: 'GBP',
    descriptionEn: 'A diverse London-based university with strong international focus and one of the highest percentages of international students in the UK.',
    descriptionAr: 'جامعة متنوعة مقرها لندن مع تركيز دولي قوي وواحدة من أعلى نسب الطلاب الدوليين في المملكة المتحدة.',
    programs: [
      { name: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 36, language: 'English', tuitionUsd: 17500, deadline: '2026-06-30' },
      { name: 'BA International Business', degreeLevel: 'bachelor', field: 'Business', durationMonths: 36, language: 'English', tuitionUsd: 17000, deadline: '2026-06-30' },
    ],
    scholarships: [
      { name: 'International Regional Scholarship', amountUsd: 2500, amountType: 'partial', eligibility: 'Students from MENA region', deadline: '2026-05-15' },
    ],
  },
  {
    slug: 'university-of-portsmouth',
    name: 'University of Portsmouth',
    country: 'United Kingdom',
    city: 'Portsmouth',
    website: 'https://www.port.ac.uk',
    tuitionUsd: 19000,
    livingCostUsd: 13000,
    intlStudentPct: 28,
    acceptanceRate: 50,
    currency: 'GBP',
    descriptionEn: 'A coastal university known for strong employability outcomes and affordable living costs compared to London.',
    descriptionAr: 'جامعة ساحلية معروفة بنتائج التوظيف القوية وتكاليف معيشة معقولة مقارنة بلندن.',
    programs: [
      { name: 'BSc Software Engineering', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 36, language: 'English', tuitionUsd: 19000, deadline: '2026-06-30' },
      { name: 'MSc Civil Engineering', degreeLevel: 'master', field: 'Engineering', durationMonths: 12, language: 'English', tuitionUsd: 20500, deadline: '2026-08-01' },
    ],
    scholarships: [
      { name: 'Vice-Chancellor Scholarship', amountUsd: 4000, amountType: 'partial', eligibility: 'Academic excellence, GPA 3.5+', deadline: '2026-04-30' },
    ],
  },
  // ===== Germany (low/no tuition) =====
  {
    slug: 'tu-berlin',
    name: 'Technical University of Berlin',
    country: 'Germany',
    city: 'Berlin',
    website: 'https://www.tu.berlin',
    tuitionUsd: 1500,
    livingCostUsd: 12000,
    intlStudentPct: 30,
    acceptanceRate: 25,
    currency: 'EUR',
    descriptionEn: 'One of Germany\'s leading technical universities with nominal semester fees. Strong engineering, computer science, and architecture programs. Most programs in German, with growing English-taught master\'s.',
    descriptionAr: 'إحدى أبرز الجامعات التقنية في ألمانيا مع رسوم فصلية رمزية. برامج قوية في الهندسة وعلوم الكمبيوتر والعمارة. معظم البرامج بالألمانية مع تزايد الماجستير بالإنجليزية.',
    programs: [
      { name: 'BSc Computer Science (German)', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 36, language: 'German', tuitionUsd: 1500, deadline: '2026-07-15', entryReqs: 'TestDaF 4x4 or DSH-2' },
      { name: 'MSc Computer Science (English)', degreeLevel: 'master', field: 'Computer Science', durationMonths: 24, language: 'English', tuitionUsd: 1500, deadline: '2026-03-31', entryReqs: 'IELTS 6.5, BSc in CS' },
      { name: 'BSc Mechanical Engineering (German)', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 36, language: 'German', tuitionUsd: 1500, deadline: '2026-07-15' },
    ],
    scholarships: [
      { name: 'DAAD Scholarship', amountUsd: 10000, amountType: 'partial', eligibility: 'International master\'s students via DAAD', deadline: '2026-10-31' },
      { name: 'Deutschlandstipendium', amountUsd: 3600, amountType: 'partial', eligibility: 'Outstanding students, all nationalities', deadline: '2026-09-15' },
    ],
  },
  {
    slug: 'university-of-stuttgart',
    name: 'University of Stuttgart',
    country: 'Germany',
    city: 'Stuttgart',
    website: 'https://www.uni-stuttgart.de',
    tuitionUsd: 1500,
    livingCostUsd: 11000,
    intlStudentPct: 22,
    acceptanceRate: 30,
    currency: 'EUR',
    descriptionEn: 'A leading technical university in southern Germany with strong ties to the automotive industry (Mercedes, Porsche HQ nearby). Nominal tuition fees.',
    descriptionAr: 'جامعة تقنية رائدة في جنوب ألمانيا مع روابط قوية مع صناعة السيارات. رسوم دراسية رمزية.',
    programs: [
      { name: 'MSc Mechanical Engineering (English)', degreeLevel: 'master', field: 'Engineering', durationMonths: 24, language: 'English', tuitionUsd: 1500, deadline: '2026-03-15' },
      { name: 'BSc Electrical Engineering (German)', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 36, language: 'German', tuitionUsd: 1500, deadline: '2026-07-15' },
    ],
    scholarships: [
      { name: 'Baden-Württemberg Scholarship', amountUsd: 6000, amountType: 'partial', eligibility: 'International exchange students', deadline: '2026-04-30' },
    ],
  },
  {
    slug: 'tu-munich',
    name: 'Technical University of Munich',
    country: 'Germany',
    city: 'Munich',
    website: 'https://www.tum.de',
    tuitionUsd: 1500,
    livingCostUsd: 14000,
    intlStudentPct: 33,
    acceptanceRate: 18,
    currency: 'EUR',
    descriptionEn: 'Germany\'s #1 technical university (QS ranking). Renowned for engineering, natural sciences, and computer science. No tuition for most programs except a nominal semester fee.',
    descriptionAr: 'الجامعة التقنية رقم 1 في ألمانيا (تصنيف QS). مشهورة بالهندسة والعلوم الطبيعية وعلوم الكمبيوتر. لا توجد رسوم دراسية لمعظم البرامج.',
    programs: [
      { name: 'BSc Information Engineering (English)', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 36, language: 'English', tuitionUsd: 1500, deadline: '2026-05-31', entryReqs: 'IELTS 6.5, strong math background' },
      { name: 'MSc Aerospace (English)', degreeLevel: 'master', field: 'Engineering', durationMonths: 24, language: 'English', tuitionUsd: 1500, deadline: '2026-01-15' },
      { name: 'BSc Management and Technology (English)', degreeLevel: 'bachelor', field: 'Business', durationMonths: 36, language: 'English', tuitionUsd: 1500, deadline: '2026-05-31' },
    ],
    scholarships: [
      { name: 'TUM Asia Scholarship', amountUsd: 8000, amountType: 'partial', eligibility: 'Asian students with academic excellence', deadline: '2026-03-31' },
    ],
  },
  // ===== Turkey =====
  {
    slug: 'bogazici-university',
    name: 'Bogazici University',
    country: 'Turkey',
    city: 'Istanbul',
    website: 'https://www.boun.edu.tr',
    tuitionUsd: 800,
    livingCostUsd: 6000,
    intlStudentPct: 15,
    acceptanceRate: 8,
    currency: 'TRY',
    descriptionEn: 'Turkey\'s most prestigious English-medium public university. Extremely competitive admissions, very low tuition. Located on a beautiful campus overlooking the Bosphorus.',
    descriptionAr: 'أعرق جامعة عامة تركية مع تدريس بالإنجليزية. قبول تنافسي للغاية ورسوم منخفضة جداً. تقع في حرم جامعي جميل يطل على البوسفور.',
    programs: [
      { name: 'BSc Computer Engineering (English)', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 48, language: 'English', tuitionUsd: 800, deadline: '2026-07-01', entryReqs: 'YOS or SAT, top 5% of applicants' },
      { name: 'BA Economics (English)', degreeLevel: 'bachelor', field: 'Business', durationMonths: 48, language: 'English', tuitionUsd: 800, deadline: '2026-07-01' },
      { name: 'MSc Mechanical Engineering (English)', degreeLevel: 'master', field: 'Engineering', durationMonths: 24, language: 'English', tuitionUsd: 1000, deadline: '2026-06-15' },
    ],
    scholarships: [
      { name: 'Türkiye Bursları Scholarship', amountUsd: 8000, amountType: 'full', eligibility: 'International students via Turkey government scholarship program', deadline: '2026-02-20' },
    ],
  },
  {
    slug: 'istanbul-technical-university',
    name: 'Istanbul Technical University',
    country: 'Turkey',
    city: 'Istanbul',
    website: 'https://www.itu.edu.tr',
    tuitionUsd: 900,
    livingCostUsd: 6000,
    intlStudentPct: 18,
    acceptanceRate: 12,
    currency: 'TRY',
    descriptionEn: 'Turkey\'s oldest technical university, founded 1773. Strong engineering and architecture programs with English-medium options.',
    descriptionAr: 'أقدم جامعة تقنية في تركيا، تأسست عام 1773. برامج قوية في الهندسة والعمارة مع خيارات باللغة الإنجليزية.',
    programs: [
      { name: 'BSc Civil Engineering (English)', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 48, language: 'English', tuitionUsd: 900, deadline: '2026-07-01' },
      { name: 'BSc Computer Engineering (English)', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 48, language: 'English', tuitionUsd: 900, deadline: '2026-07-01' },
    ],
    scholarships: [
      { name: 'ITU International Scholarship', amountUsd: 5000, amountType: 'partial', eligibility: 'International students with strong academic record', deadline: '2026-05-15' },
    ],
  },
  {
    slug: 'koç-university',
    name: 'Koç University',
    country: 'Turkey',
    city: 'Istanbul',
    website: 'https://www.ku.edu.tr',
    tuitionUsd: 18000,
    livingCostUsd: 8000,
    intlStudentPct: 20,
    acceptanceRate: 15,
    currency: 'USD',
    descriptionEn: 'A top private university in Istanbul with English-medium instruction and strong international partnerships. Higher tuition but generous scholarships.',
    descriptionAr: 'جامعة خاصة رائدة في إسطنبول مع تدريس بالإنجليزية وشراكات دولية قوية. رسوم أعلى لكن مع منح سخية.',
    programs: [
      { name: 'BSc Business Administration', degreeLevel: 'bachelor', field: 'Business', durationMonths: 48, language: 'English', tuitionUsd: 18000, deadline: '2026-07-15' },
      { name: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 48, language: 'English', tuitionUsd: 18000, deadline: '2026-07-15' },
    ],
    scholarships: [
      { name: 'Merit Scholarship', amountUsd: 18000, amountType: 'full', eligibility: 'Top 10% applicants, full tuition waiver', deadline: '2026-06-30' },
    ],
  },
  // ===== Poland =====
  {
    slug: 'university-of-warsaw',
    name: 'University of Warsaw',
    country: 'Poland',
    city: 'Warsaw',
    website: 'https://www.uw.edu.pl',
    tuitionUsd: 3500,
    livingCostUsd: 6000,
    intlStudentPct: 12,
    acceptanceRate: 35,
    currency: 'PLN',
    descriptionEn: 'Poland\'s largest and most prestigious university. Affordable tuition for EU and non-EU students, with growing English-medium program offerings.',
    descriptionAr: 'أكبر وأعرق جامعة في بولندا. رسوم دراسية معقولة للطلاب من الاتحاد الأوروبي وخارجه مع تزايد البرامج باللغة الإنجليزية.',
    programs: [
      { name: 'BA International Relations (English)', degreeLevel: 'bachelor', field: 'Social Sciences', durationMonths: 36, language: 'English', tuitionUsd: 3500, deadline: '2026-07-15' },
      { name: 'BSc Computer Science (English)', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 36, language: 'English', tuitionUsd: 4000, deadline: '2026-07-15' },
      { name: 'MA Economics (English)', degreeLevel: 'master', field: 'Business', durationMonths: 24, language: 'English', tuitionUsd: 4000, deadline: '2026-07-15' },
    ],
    scholarships: [
      { name: 'Polish Government Scholarship', amountUsd: 6000, amountType: 'partial', eligibility: 'International students via Polish Ministry of Education', deadline: '2026-03-31' },
    ],
  },
  {
    slug: 'jagiellonian-university',
    name: 'Jagiellonian University',
    country: 'Poland',
    city: 'Krakow',
    website: 'https://en.uj.edu.pl',
    tuitionUsd: 3800,
    livingCostUsd: 5500,
    intlStudentPct: 10,
    acceptanceRate: 30,
    currency: 'PLN',
    descriptionEn: 'Poland\'s oldest university (founded 1364). Strong programs in medicine, law, international relations. Affordable Krakow living costs.',
    descriptionAr: 'أقدم جامعة في بولندا (تأسست 1364). برامج قوية في الطب والقانون والعلاقات الدولية. تكاليف معيشة معقولة في كراكوف.',
    programs: [
      { name: 'MD Medicine (English)', degreeLevel: 'bachelor', field: 'Medicine', durationMonths: 72, language: 'English', tuitionUsd: 14000, deadline: '2026-07-01', entryReqs: 'Biology + Chemistry entrance exam' },
      { name: 'BA International Relations', degreeLevel: 'bachelor', field: 'Social Sciences', durationMonths: 36, language: 'English', tuitionUsd: 3800, deadline: '2026-07-15' },
    ],
    scholarships: [
      { name: 'JU Merit Scholarship', amountUsd: 2000, amountType: 'partial', eligibility: 'Top international applicants', deadline: '2026-05-31' },
    ],
  },
  // ===== Malaysia =====
  {
    slug: 'university-of-malaya',
    name: 'University of Malaya',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
    website: 'https://www.um.edu.my',
    tuitionUsd: 5500,
    livingCostUsd: 5000,
    intlStudentPct: 25,
    acceptanceRate: 30,
    currency: 'MYR',
    descriptionEn: 'Malaysia\'s top-ranked university (QS Top 100). Affordable tuition and low living costs make it popular with MENA students. English-medium programs widely available.',
    descriptionAr: 'أعلى جامعة ماليزية تصنيفاً (QS Top 100). رسوم دراسية معقولة وتكاليف معيشة منخفضة تجعلها محببة للطلاب من الشرق الأوسط. برامج بالإنجليزية متاحة على نطاق واسع.',
    programs: [
      { name: 'BEng Computer Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 48, language: 'English', tuitionUsd: 5500, deadline: '2026-06-30' },
      { name: 'BBA Business Administration', degreeLevel: 'bachelor', field: 'Business', durationMonths: 36, language: 'English', tuitionUsd: 5000, deadline: '2026-06-30' },
      { name: 'MSc Data Science', degreeLevel: 'master', field: 'Computer Science', durationMonths: 18, language: 'English', tuitionUsd: 6500, deadline: '2026-08-31' },
    ],
    scholarships: [
      { name: 'UM International Scholarship', amountUsd: 4000, amountType: 'partial', eligibility: 'International students with GPA 3.3+', deadline: '2026-04-30' },
    ],
  },
  {
    slug: 'universiti-teknologi-malaysia',
    name: 'Universiti Teknologi Malaysia',
    country: 'Malaysia',
    city: 'Johor Bahru',
    website: 'https://www.utm.my',
    tuitionUsd: 4800,
    livingCostUsd: 4500,
    intlStudentPct: 20,
    acceptanceRate: 40,
    currency: 'MYR',
    descriptionEn: 'Malaysia\'s premier engineering and technology university. Very affordable, English-medium, with strong industry placement.',
    descriptionAr: 'الجامعة الماليزية الرائدة في الهندسة والتكنولوجيا. ميسورة التكلفة، تدريس بالإنجليزية، مع توظيف صناعي قوي.',
    programs: [
      { name: 'BEng Civil Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 48, language: 'English', tuitionUsd: 4800, deadline: '2026-06-30' },
      { name: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 36, language: 'English', tuitionUsd: 4500, deadline: '2026-06-30' },
    ],
    scholarships: [
      { name: 'UTM International Grant', amountUsd: 3000, amountType: 'partial', eligibility: 'International students with academic merit', deadline: '2026-05-15' },
    ],
  },
  // ===== Egypt =====
  {
    slug: 'american-university-in-cairo',
    name: 'American University in Cairo',
    country: 'Egypt',
    city: 'Cairo',
    website: 'https://www.aucegypt.edu',
    tuitionUsd: 14000,
    livingCostUsd: 5000,
    intlStudentPct: 18,
    acceptanceRate: 35,
    currency: 'USD',
    descriptionEn: 'Egypt\'s premier American-style university. US-accredited degrees, English-medium, strong regional reputation. Higher tuition but generous financial aid.',
    descriptionAr: 'أعرق جامعة على الطريقة الأمريكية في مصر. شهادات معتمدة أمريكياً، تدريس بالإنجليزية، سمعة إقليمية قوية. رسوم أعلى لكن مع مساعدات مالية سخية.',
    programs: [
      { name: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 48, language: 'English', tuitionUsd: 14000, deadline: '2026-06-15' },
      { name: 'BBA Business Administration', degreeLevel: 'bachelor', field: 'Business', durationMonths: 48, language: 'English', tuitionUsd: 13500, deadline: '2026-06-15' },
      { name: 'MA International Relations', degreeLevel: 'master', field: 'Social Sciences', durationMonths: 24, language: 'English', tuitionUsd: 15000, deadline: '2026-07-30' },
    ],
    scholarships: [
      { name: 'AUC Excellence Scholarship', amountUsd: 14000, amountType: 'full', eligibility: 'Top academic performers, full tuition coverage', deadline: '2026-03-15' },
      { name: 'AUC Financial Aid', amountUsd: 7000, amountType: 'partial', eligibility: 'Need-based, demonstrated financial need', deadline: '2026-04-30' },
    ],
  },
  {
    slug: 'cairo-university',
    name: 'Cairo University',
    country: 'Egypt',
    city: 'Cairo',
    website: 'https://cu.edu.eg',
    tuitionUsd: 2500,
    livingCostUsd: 4000,
    intlStudentPct: 8,
    acceptanceRate: 20,
    currency: 'EGP',
    descriptionEn: 'Egypt\'s oldest and largest public university. Very affordable, strong programs in engineering, medicine, and law. Primarily Arabic-medium with some English programs.',
    descriptionAr: 'أقدم وأكبر جامعة عامة في مصر. ميسورة التكلفة، برامج قوية في الهندسة والطب والقانون. تدريس بالعربية بشكل أساسي مع بعض البرامج بالإنجليزية.',
    programs: [
      { name: 'BSc Engineering (Arabic/English)', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 60, language: 'Arabic', tuitionUsd: 2500, deadline: '2026-08-01' },
      { name: 'BSc Computer Science (English)', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 48, language: 'English', tuitionUsd: 3000, deadline: '2026-08-01' },
    ],
    scholarships: [
      { name: 'Egyptian Government Scholarship', amountUsd: 2500, amountType: 'full', eligibility: 'International Arab students via Ministry of Higher Education', deadline: '2026-05-31' },
    ],
  },
  // ===== Jordan =====
  {
    slug: 'university-of-jordan',
    name: 'University of Jordan',
    country: 'Jordan',
    city: 'Amman',
    website: 'https://www.ju.edu.jo',
    tuitionUsd: 2200,
    livingCostUsd: 6000,
    intlStudentPct: 14,
    acceptanceRate: 40,
    currency: 'JOD',
    descriptionEn: 'Jordan\'s largest and oldest university. Affordable, well-regarded across the Arab world. Strong medicine, engineering, and business programs.',
    descriptionAr: 'أكبر وأقدم جامعة في الأردن. ميسورة التكلفة، تحظى بسمعة طيبة في جميع أنحاء العالم العربي. برامج قوية في الطب والهندسة والأعمال.',
    programs: [
      { name: 'BSc Computer Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 60, language: 'English', tuitionUsd: 2200, deadline: '2026-08-15' },
      { name: 'BBA Business Administration', degreeLevel: 'bachelor', field: 'Business', durationMonths: 48, language: 'Arabic', tuitionUsd: 2000, deadline: '2026-08-15' },
      { name: 'MD Medicine', degreeLevel: 'bachelor', field: 'Medicine', durationMonths: 72, language: 'English', tuitionUsd: 4500, deadline: '2026-08-15' },
    ],
    scholarships: [
      { name: 'Jordanian Government Scholarship', amountUsd: 2200, amountType: 'full', eligibility: 'Arab students via bilateral agreements', deadline: '2026-04-30' },
    ],
  },
  {
    slug: 'jordan-university-of-science-and-technology',
    name: 'Jordan University of Science and Technology',
    country: 'Jordan',
    city: 'Irbid',
    website: 'https://www.just.edu.jo',
    tuitionUsd: 2400,
    livingCostUsd: 5500,
    intlStudentPct: 22,
    acceptanceRate: 35,
    currency: 'JOD',
    descriptionEn: 'A leading technical university focused on engineering, medicine, and applied sciences. Strong regional reputation, particularly for medical and pharmacy programs.',
    descriptionAr: 'جامعة تقنية رائدة تركز على الهندسة والطب والعلوم التطبيقية. سمعة إقليمية قوية، خاصة في البرامج الطبية والصيدلة.',
    programs: [
      { name: 'BSc Mechanical Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 60, language: 'English', tuitionUsd: 2400, deadline: '2026-08-15' },
      { name: 'PharmD Pharmacy', degreeLevel: 'bachelor', field: 'Medicine', durationMonths: 72, language: 'English', tuitionUsd: 3500, deadline: '2026-08-15' },
    ],
    scholarships: [
      { name: 'JUST International Scholarship', amountUsd: 1500, amountType: 'partial', eligibility: 'International students with strong academic record', deadline: '2026-05-15' },
    ],
  },
  // ===== UAE =====
  {
    slug: 'khalifa-university',
    name: 'Khalifa University of Science and Technology',
    country: 'United Arab Emirates',
    city: 'Abu Dhabi',
    website: 'https://www.ku.ac.ae',
    tuitionUsd: 16000,
    livingCostUsd: 12000,
    intlStudentPct: 35,
    acceptanceRate: 25,
    currency: 'AED',
    descriptionEn: 'UAE\'s top-ranked university for engineering and science. Generous scholarships for international students, English-medium, modern campus.',
    descriptionAr: 'أعلى جامعة في الإمارات العربية المتحدة في الهندسة والعلوم. منح سخية للطلاب الدوليين، تدريس بالإنجليزية، حرم جامعي حديث.',
    programs: [
      { name: 'BSc Aerospace Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 48, language: 'English', tuitionUsd: 16000, deadline: '2026-05-31' },
      { name: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 48, language: 'English', tuitionUsd: 16000, deadline: '2026-05-31' },
      { name: 'MSc Electrical Engineering', degreeLevel: 'master', field: 'Engineering', durationMonths: 24, language: 'English', tuitionUsd: 18000, deadline: '2026-06-30' },
    ],
    scholarships: [
      { name: 'KU Full Scholarship', amountUsd: 28000, amountType: 'full', eligibility: 'Outstanding international students, covers tuition + stipend', deadline: '2026-03-31' },
    ],
  },
  {
    slug: 'american-university-of-sharjah',
    name: 'American University of Sharjah',
    country: 'United Arab Emirates',
    city: 'Sharjah',
    website: 'https://www.aus.edu',
    tuitionUsd: 17000,
    livingCostUsd: 11000,
    intlStudentPct: 45,
    acceptanceRate: 40,
    currency: 'USD',
    descriptionEn: 'A US-accredited university in the UAE with strong international student body. American-style liberal arts education with engineering and business programs.',
    descriptionAr: 'جامعة معتمدة أمريكياً في الإمارات مع هيكل طلابي دولي قوي. تعليم ليبرالي على الطريقة الأمريكية مع برامج هندسة وأعمال.',
    programs: [
      { name: 'BSc Computer Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 48, language: 'English', tuitionUsd: 17000, deadline: '2026-06-30' },
      { name: 'BBA Business Administration', degreeLevel: 'bachelor', field: 'Business', durationMonths: 48, language: 'English', tuitionUsd: 16500, deadline: '2026-06-30' },
    ],
    scholarships: [
      { name: 'AUS Merit Scholarship', amountUsd: 17000, amountType: 'full', eligibility: 'Top 10% applicants, full tuition', deadline: '2026-04-15' },
      { name: 'AUS Family Tuition Discount', amountUsd: 3000, amountType: 'partial', eligibility: 'Siblings enrolled simultaneously', deadline: '2026-06-30' },
    ],
  },
  // ===== Lebanon =====
  {
    slug: 'american-university-of-beirut',
    name: 'American University of Beirut',
    country: 'Lebanon',
    city: 'Beirut',
    website: 'https://www.aub.edu.lb',
    tuitionUsd: 16500,
    livingCostUsd: 9000,
    intlStudentPct: 22,
    acceptanceRate: 30,
    currency: 'USD',
    descriptionEn: 'The Middle East\'s oldest American-accredited university (founded 1866). Regional prestige, US-accredited degrees, English-medium.',
    descriptionAr: 'أقدم جامعة معتمدة أمريكياً في الشرق الأوسط (تأسست 1866). سمعة إقليمية، شهادات معتمدة أمريكياً، تدريس بالإنجليزية.',
    programs: [
      { name: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 48, language: 'English', tuitionUsd: 16500, deadline: '2026-06-15' },
      { name: 'BBA Business Administration', degreeLevel: 'bachelor', field: 'Business', durationMonths: 48, language: 'English', tuitionUsd: 16000, deadline: '2026-06-15' },
      { name: 'MD Medicine', degreeLevel: 'bachelor', field: 'Medicine', durationMonths: 72, language: 'English', tuitionUsd: 22000, deadline: '2026-03-31' },
    ],
    scholarships: [
      { name: 'AUBMerit Scholarship', amountUsd: 16500, amountType: 'full', eligibility: 'Top 5% applicants, full tuition', deadline: '2026-03-15' },
      { name: 'AUB Need-Based Aid', amountUsd: 8000, amountType: 'partial', eligibility: 'Demonstrated financial need', deadline: '2026-04-30' },
    ],
  },
  // ===== Lithuania =====
  {
    slug: 'vilnius-university',
    name: 'Vilnius University',
    country: 'Lithuania',
    city: 'Vilnius',
    website: 'https://www.vu.lt',
    tuitionUsd: 4000,
    livingCostUsd: 5000,
    intlStudentPct: 12,
    acceptanceRate: 40,
    currency: 'EUR',
    descriptionEn: 'Lithuania\'s oldest and most prestigious university (founded 1579). Affordable EU tuition, English-medium programs growing rapidly.',
    descriptionAr: 'أقدم وأعرق جامعة في ليتوانيا (تأسست 1579). رسوم دراسية معقولة في الاتحاد الأوروبي، برامج بالإنجليزية تتزايد بسرعة.',
    programs: [
      { name: 'BSc Software Engineering (English)', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 42, language: 'English', tuitionUsd: 4000, deadline: '2026-07-15' },
      { name: 'BA International Business (English)', degreeLevel: 'bachelor', field: 'Business', durationMonths: 36, language: 'English', tuitionUsd: 3800, deadline: '2026-07-15' },
    ],
    scholarships: [
      { name: 'Lithuanian State Scholarship', amountUsd: 4000, amountType: 'partial', eligibility: 'International students via Lithuanian Ministry', deadline: '2026-04-30' },
    ],
  },
  {
    slug: 'vilnius-gediminas-technical-university',
    name: 'Vilnius Gediminas Technical University',
    country: 'Lithuania',
    city: 'Vilnius',
    website: 'https://vilniustech.lt',
    tuitionUsd: 3800,
    livingCostUsd: 4800,
    intlStudentPct: 15,
    acceptanceRate: 45,
    currency: 'EUR',
    descriptionEn: 'A leading Lithuanian technical university with strong English-medium engineering and IT programs. Very affordable EU education.',
    descriptionAr: 'جامعة تقنية ليتوانية رائدة مع برامج قوية بالإنجليزية في الهندسة وتكنولوجيا المعلومات. تعليم في الاتحاد الأوروبي ميسور التكلفة للغاية.',
    programs: [
      { name: 'BSc Information Systems Engineering (English)', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 42, language: 'English', tuitionUsd: 3800, deadline: '2026-07-15' },
      { name: 'MSc Civil Engineering (English)', degreeLevel: 'master', field: 'Engineering', durationMonths: 24, language: 'English', tuitionUsd: 4200, deadline: '2026-07-15' },
    ],
    scholarships: [
      { name: 'VGTU Tuition Waiver', amountUsd: 3800, amountType: 'full', eligibility: 'Top international applicants, full tuition', deadline: '2026-05-31' },
    ],
  },
]

async function seed() {
  console.log(`Seeding ${universities.length} universities...`)

  // Create a demo user
  const demoUser = await db.user.upsert({
    where: { email: 'fatima@example.com' },
    update: {},
    create: {
      email: 'fatima@example.com',
      name: 'Fatima Al-Rashid',
      country: 'Jordan',
      fieldOfInterest: 'Computer Science',
      role: 'student',
      verificationStatus: 'verified',
      locale: 'en',
    },
  })

  const secondUser = await db.user.upsert({
    where: { email: 'ahmed@example.com' },
    update: {},
    create: {
      email: 'ahmed@example.com',
      name: 'Ahmed Hassan',
      country: 'Egypt',
      fieldOfInterest: 'Engineering',
      role: 'student',
      verificationStatus: 'verified',
      locale: 'en',
    },
  })

  // Clear existing data (cascade should handle related records)
  await db.review.deleteMany({})
  await db.scholarship.deleteMany({})
  await db.program.deleteMany({})
  await db.university.deleteMany({})

  for (const uni of universities) {
    const { programs, scholarships, ...uniData } = uni
    const created = await db.university.create({ data: uniData })

    for (const p of programs) {
      await db.program.create({ data: { ...p, universityId: created.id } })
    }
    for (const s of scholarships) {
      await db.scholarship.create({ data: { ...s, universityId: created.id } })
    }
  }

  // Seed a few reviews
  const tuBerlin = await db.university.findUnique({ where: { slug: 'tu-berlin' } })
  const bogazici = await db.university.findUnique({ where: { slug: 'bogazici-university' } })
  const auc = await db.university.findUnique({ where: { slug: 'american-university-in-cairo' } })
  const malaya = await db.university.findUnique({ where: { slug: 'university-of-malaya' } })

  if (tuBerlin && demoUser) {
    await db.review.create({
      data: {
        userId: demoUser.id,
        universityId: tuBerlin.id,
        ratingOverall: 5,
        ratingAffordability: 5,
        ratingVisa: 4,
        ratingTeaching: 5,
        ratingSafety: 5,
        ratingSocial: 4,
        reviewText: 'TU Berlin exceeded my expectations. The tuition is essentially free (just 1500 EUR/semester admin fee), and the CS faculty is world-class. Berlin student life is amazing - lots of international community, affordable housing if you find it early. Visa process was straightforward but requires blocked account proof.',
        helpfulCount: 12,
        moderationStatus: 'approved',
        verifiedEnrollment: true,
        tags: '["affordable", "great teaching", "easy visa", "international community"]',
      },
    })
  }

  if (bogazici && secondUser) {
    await db.review.create({
      data: {
        userId: secondUser.id,
        universityId: bogazici.id,
        ratingOverall: 5,
        ratingAffordability: 5,
        ratingVisa: 3,
        ratingTeaching: 5,
        ratingSafety: 4,
        ratingSocial: 5,
        reviewText: 'Bogazici is the Harvard of Turkey. Getting in is very competitive but if you do, the education is world-class and almost free. The campus is gorgeous, overlooking the Bosphorus. Turkish student life is vibrant. Only downside: visa process for non-Turkish students can be slow.',
        helpfulCount: 8,
        moderationStatus: 'approved',
        verifiedEnrollment: true,
        tags: '["prestigious", "very affordable", "competitive", "beautiful campus"]',
      },
    })
  }

  if (auc && demoUser) {
    await db.review.create({
      data: {
        userId: demoUser.id,
        universityId: auc.id,
        ratingOverall: 4,
        ratingAffordability: 3,
        ratingVisa: 5,
        ratingTeaching: 4,
        ratingSafety: 4,
        ratingSocial: 5,
        reviewText: 'AUC is the most expensive option in Egypt but the US accreditation makes it worth it for many. Cairo living is very affordable. Career services are excellent - lots of regional MBB and banking recruitment. The new campus in New Cairo is modern but far from downtown.',
        helpfulCount: 5,
        moderationStatus: 'approved',
        verifiedEnrollment: false,
        tags: '["US accredited", "good career services", "expensive", "modern campus"]',
      },
    })
  }

  if (malaya && secondUser) {
    await db.review.create({
      data: {
        userId: secondUser.id,
        universityId: malaya.id,
        ratingOverall: 4,
        ratingAffordability: 5,
        ratingVisa: 4,
        ratingTeaching: 4,
        ratingSafety: 5,
        ratingSocial: 4,
        reviewText: 'UM is great value - top 100 QS ranking at very low tuition. KL is a fantastic city for international students, halal food everywhere, English widely spoken. The CS program is solid but could use more industry connections. Visa process via EMGS was smooth.',
        helpfulCount: 7,
        moderationStatus: 'approved',
        verifiedEnrollment: true,
        tags: '["halal friendly", "affordable", "good ranking", "english friendly"]',
      },
    })
  }

  // Create a saved list for demo user
  if (tuBerlin && bogazici && auc && demoUser) {
    await db.savedList.create({
      data: {
        userId: demoUser.id,
        listName: 'My Top Picks',
        universities: JSON.stringify([tuBerlin.id, bogazici.id, auc.id]),
        isPublic: true,
        shareToken: createHash('sha256').update(demoUser.id + Date.now()).digest('hex').slice(0, 16),
      },
    })
  }

  const counts = await Promise.all([
    db.university.count(),
    db.program.count(),
    db.scholarship.count(),
    db.review.count(),
    db.user.count(),
    db.savedList.count(),
  ])
  console.log(`Seeded: ${counts[0]} universities, ${counts[1]} programs, ${counts[2]} scholarships, ${counts[3]} reviews, ${counts[4]} users, ${counts[5]} saved lists`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
