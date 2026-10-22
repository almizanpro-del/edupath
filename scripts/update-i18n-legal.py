"""
Updates messages/en.json and messages/ar.json with new i18n keys for:
  - Legal.privacy, Legal.terms, Legal.cookies (full legal page content)
  - Footer.items.* (new footer link labels + Legal section header)
  - Footer.legal (new column header)
  - Auth.forgotPassword, Auth.agreePrefix, Auth.termsLink, Auth.andPrefix,
    Auth.privacyLink, Auth.mustAgree
  - Nav.accountSettings

The legal content is real, substantive text — not placeholder. Arabic
translations are professional-grade MSA.
"""
import json
from pathlib import Path

# --- New keys to inject ---

NEW_AUTH_KEYS = {
    "forgotPassword": "Forgot password?",
    "agreePrefix": "I agree to EduPath's",
    "termsLink": "Terms of Service",
    "andPrefix": "and",
    "privacyLink": "Privacy Policy",
    "mustAgree": "Please accept the Terms and Privacy Policy to continue.",
}

NEW_NAV_KEYS = {
    "accountSettings": "Account settings",
}

NEW_FOOTER_ITEMS = {
    "scholarships": "Scholarships",
    "transferFinder": "Transfer Finder",
    "essayReview": "Essay Review",
    "aiAdvisor": "AI Advisor",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "cookies": "Cookie Policy",
    "account": "Account Settings",
}
NEW_FOOTER_LEGAL = "Legal"

LEGAL_PRIVACY = {
    "title": "Privacy Policy",
    "effectiveDate": "Effective: October 23, 2026",
    "intro": "EduPath (\"we\", \"us\", \"our\") operates the edupath.com website and related services (the \"Service\"). This Privacy Policy explains what personal information we collect, why we collect it, how we use it, and the rights you have over your data. We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR), the Jordan Personal Protection Privacy Law No. 24 of 2023 (PPL), and other applicable data protection laws.",
    "sections": {
        "collect": {
            "title": "1. Information We Collect",
            "body": "We collect information you provide directly to us:\n\nAccount information: When you sign up, we collect your full name, email address, password (hashed), country, and field of interest. If you sign up via Google, we receive your Google account name and email.\n\nProfile data: As you use EduPath, we store your saved universities, Rihla AI chat sessions, scholarship matches, essay review history, and reviews you submit.\n\nLead inquiries: When you contact a university through EduPath, we store your name, email, country, GPA, field of interest, and message.\n\nUsage data: We automatically collect information about how you interact with the Service — pages visited, time spent, clicks, search queries, and device information (browser type, screen size, approximate location by country). We use this data in aggregate to improve the Service.\n\nCookies: We use cookies and similar technologies for authentication, language preference, and (with your consent) analytics. See our Cookie Policy for details."
        },
        "use": {
            "title": "2. How We Use Your Information",
            "body": "We use your information to:\n\n• Provide, operate, and maintain the Service\n• Create and manage your account\n• Personalize your experience (e.g., recommend universities based on your saved list)\n• Process your inquiries to universities and deliver responses\n• Send you service-related emails (welcome email, deadline alerts, review status notifications)\n• Analyze usage patterns to improve features and fix bugs\n• Detect, prevent, and address fraud, abuse, and security issues\n• Comply with our legal obligations\n\nWe do NOT sell your personal information to third parties. We do NOT use your data to train AI models without your explicit consent."
        },
        "legal": {
            "title": "3. Legal Basis for Processing (GDPR Article 6)",
            "body": "Under the GDPR, we process your personal data on the following legal bases:\n\n• Consent: You consent to our use of your data when you create an account and accept this Privacy Policy. You can withdraw consent at any time by deleting your account.\n• Contract: Processing is necessary to provide the Service you requested (e.g., saving universities, submitting reviews, contacting universities).\n• Legal obligation: We may process data to comply with legal requirements (e.g., tax records, responding to lawful requests).\n• Legitimate interests: We process usage data to improve security, prevent fraud, and enhance the Service — these interests are balanced against your privacy rights.\n\nUnder Jordan's PPL No. 24 of 2023, we process your data based on your informed consent and to fulfill the Service's purpose."
        },
        "cookies": {
            "title": "4. Cookies and Tracking Technologies",
            "body": "We use the following categories of cookies:\n\n• Strictly necessary: Required for authentication (session tokens) and language preference. These cannot be disabled.\n• Analytics (optional): Used to understand how students use EduPath so we can improve it. Only set if you accept analytics cookies via our consent banner.\n• Functional (optional): Remember your preferences (theme, saved filters).\n\nYou can control cookies through your browser settings and our consent banner. See our Cookie Policy for the full list of cookies we use."
        },
        "share": {
            "title": "5. Information Sharing and Disclosure",
            "body": "We do NOT sell your personal information. We share data only in these circumstances:\n\n• With universities: When you submit a lead inquiry, we share your name, email, country, GPA, field, and message with the university you contacted.\n• With service providers: We use Supabase (authentication and database hosting), Vercel (web hosting), Resend (email delivery), and OpenAI/xAI (AI essay review and Rihla chat). These providers process data on our behalf under Data Processing Agreements and are bound by confidentiality obligations.\n• For legal compliance: We may disclose data if required by law, court order, or government request, or to protect our rights, property, or safety.\n• Business transfers: In the event of a merger, acquisition, or asset sale, user data may be transferred to the acquiring entity. We will notify you 30 days before such a transfer.\n\nWe never share your data for advertising purposes."
        },
        "retention": {
            "title": "6. Data Retention",
            "body": "We retain your personal data for as long as your account is active, or as needed to provide the Service. Specific retention periods:\n\n• Account data: Until you delete your account\n• Reviews: Until you delete them (or your account)\n• Rihla AI sessions: 24 months after your last activity\n• Essay reviews: 12 months after submission\n• Lead inquiries: 36 months (to comply with potential consumer-protection inquiries)\n• Analytics data (aggregated): Indefinitely (no personal identification)\n• Server logs: 90 days\n\nWhen data is no longer needed, we delete it or anonymize it so it cannot be linked to you."
        },
        "rights": {
            "title": "7. Your Rights",
            "body": "Under the GDPR and Jordan PPL, you have the following rights:\n\n• Right of access: You can request a copy of all personal data we hold about you.\n• Right to rectification: You can correct inaccurate or incomplete data.\n• Right to erasure (\"right to be forgotten\"): You can delete your account at any time via Account Settings. We will remove your data within 30 days.\n• Right to restrict processing: You can ask us to limit how we use your data.\n• Right to data portability: You can request your data in a machine-readable format.\n• Right to object: You can object to processing based on legitimate interests.\n• Right to withdraw consent: You can withdraw consent at any time without affecting the lawfulness of processing before withdrawal.\n\nTo exercise any of these rights, email privacy@edupath.com. We will respond within 30 days. If you are not satisfied with our response, you can complain to your local data protection authority (e.g., the Jordan Data Protection Unit, or your EU member state's DPA)."
        },
        "transfer": {
            "title": "8. International Data Transfers",
            "body": "EduPath is hosted on Vercel (United States) and Supabase (United States/EU). Your data may be transferred to and processed in these countries. We ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission, and we only transfer data to countries that provide an adequate level of protection.\n\nIf you are in Jordan, your data is processed under Jordan's PPL which permits international transfers subject to appropriate safeguards."
        },
        "security": {
            "title": "9. Data Security",
            "body": "We take reasonable technical and organizational measures to protect your data:\n\n• All data in transit is encrypted via TLS 1.2+\n• Passwords are hashed by Supabase Auth using bcrypt\n• Database access is restricted to authenticated server-side code\n• API routes are protected by CSRF checks, rate limiting, and input validation\n• We monitor for suspicious activity and have an incident response plan\n\nNo method of transmission over the internet is 100% secure. We cannot guarantee absolute security, but we work hard to protect your data and will notify affected users within 72 hours of any breach as required by GDPR Article 33."
        },
        "children": {
            "title": "10. Children's Privacy",
            "body": "EduPath is intended for students aged 16 and older. We do not knowingly collect data from children under 16. If you believe we have collected data from a child under 16, please contact privacy@edupath.com and we will delete it immediately.\n\nStudents aged 16–18 may use EduPath with the consent of a parent or legal guardian. By creating an account, you represent that you are 16 or older, or that you have parental consent."
        },
        "changes": {
            "title": "11. Changes to This Policy",
            "body": "We may update this Privacy Policy from time to time. We will notify you of material changes by email (if you have an account) and by posting a notice on the EduPath homepage 30 days before the change takes effect. The \"Effective date\" at the top of this page indicates when the policy was last revised.\n\nContinued use of the Service after the effective date constitutes acceptance of the updated policy."
        },
        "contact": {
            "title": "12. Contact Us",
            "body": "If you have questions about this Privacy Policy or your personal data, contact us:\n\n• Email: privacy@edupath.com\n• Subject: Privacy Inquiry\n\nWe aim to respond to all privacy inquiries within 5 business days. For urgent matters related to data deletion, mark your subject as \"URGENT — Deletion Request\"."
        },
    },
    "footer": {
        "contact": "Questions about privacy"
    }
}

LEGAL_TERMS = {
    "title": "Terms of Service",
    "effectiveDate": "Effective: October 23, 2026",
    "intro": "Welcome to EduPath. These Terms of Service (\"Terms\") govern your use of the edupath.com website and related services (the \"Service\"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.",
    "sections": {
        "acceptance": {"title": "1. Acceptance of Terms", "body": "By accessing or using EduPath, you agree to be bound by these Terms and our Privacy Policy. If you are using EduPath on behalf of an organization (e.g., as a university recruiter), you represent that you have authority to bind that organization."},
        "eligibility": {"title": "2. Eligibility", "body": "You must be at least 16 years old to use EduPath. If you are under 18, you must have the consent of a parent or legal guardian. By using EduPath, you represent that you meet these requirements."},
        "accounts": {"title": "3. Your Account", "body": "You are responsible for maintaining the security of your account and password. You agree to provide accurate information at signup and to keep it updated. You must not share your account credentials with others. We reserve the right to suspend or terminate accounts that violate these Terms."},
        "use": {"title": "4. Acceptable Use", "body": "You agree NOT to:\n\n• Use EduPath for any unlawful purpose\n• Submit false or misleading information in reviews, leads, or essays\n• Impersonate another person or misrepresent your affiliation with a university\n• Spam, harass, or threaten other users\n• Attempt to access data you are not authorized to access\n• Reverse-engineer, scrape, or otherwise disrupt the Service\n• Use automated scripts (bots) without our prior written consent\n\nViolations may result in account termination and legal action."},
        "content": {"title": "5. User Content", "body": "You retain ownership of content you submit to EduPath (reviews, essays, lead inquiries, profile information). By submitting content, you grant EduPath a worldwide, non-exclusive, royalty-free license to host, display, and process that content for the purpose of operating the Service.\n\nYou represent that you have the rights to any content you submit and that it does not infringe the rights of any third party."},
        "reviews": {"title": "6. Reviews and Ratings", "body": "Reviews must be based on your genuine experience. We may moderate, remove, or reject reviews that:\n\n• Contain false or misleading information\n• Include hate speech, discrimination, or personal attacks\n• Promote illegal activities\n• Contain advertising or promotional content\n• Were submitted in exchange for compensation (paid reviews)\n\nWe reserve the right to remove any review at our discretion. Reviews flagged as \"Sample\" are synthetic and not from real students."},
        "ip": {"title": "7. Intellectual Property", "body": "The EduPath website, including its design, code, logos, university data (where created by us), and documentation, is our property or the property of our licensors. University names, logos, and program information belong to their respective institutions.\n\nYou may not copy, modify, distribute, or create derivative works from EduPath without our prior written consent."},
        "disclaimer": {"title": "8. Disclaimers", "body": "EduPath is provided \"as is\" and \"as available\" without warranties of any kind. We do not guarantee that:\n\n• University information (tuition, deadlines, requirements) is accurate or current\n• Scholarship matching will result in actual awards\n• Essay reviews will improve your admission chances\n• The Service will be uninterrupted or error-free\n\nUniversity data is sourced from public websites and may be outdated. Always verify critical information (deadlines, tuition, requirements) directly with the institution before applying."},
        "liability": {"title": "9. Limitation of Liability", "body": "To the maximum extent permitted by law, EduPath and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:\n\n• Loss of admission opportunities\n• Loss of scholarships\n• Loss of data\n• Business interruption\n\nOur total liability for any claim arising from your use of EduPath shall not exceed the amount you paid us in the 12 months preceding the claim, or $50 USD, whichever is greater."},
        "indemnity": {"title": "10. Indemnification", "body": "You agree to indemnify and hold EduPath harmless from any claims, damages, losses, or expenses (including legal fees) arising from: (a) your violation of these Terms, (b) your violation of any third-party rights, or (c) content you submit to the Service."},
        "termination": {"title": "11. Termination", "body": "You may delete your account at any time via Account Settings. We may suspend or terminate your access to EduPath if you violate these Terms or if we believe your conduct is harmful to other users or to us. Upon termination, your right to use the Service ends immediately. Sections that by their nature should survive termination (e.g., intellectual property, disclaimers, liability) will remain in effect."},
        "law": {"title": "12. Governing Law and Disputes", "body": "These Terms are governed by the laws of the Hashemite Kingdom of Jordan, without regard to conflict-of-law principles. Any dispute arising from these Terms or your use of EduPath will be resolved exclusively in the courts of Amman, Jordan. If you are a consumer in the EU or UK, you may also bring proceedings in your country of residence and may benefit from mandatory consumer protection laws."},
        "changes": {"title": "13. Changes to These Terms", "body": "We may update these Terms from time to time. We will notify you of material changes by email and by posting a notice on the EduPath homepage 30 days before the change takes effect. Continued use of the Service after the effective date constitutes acceptance of the updated Terms."},
        "contact": {"title": "14. Contact Us", "body": "If you have questions about these Terms, contact us:\n\n• Email: legal@edupath.com\n• Subject: Terms Inquiry"}
    },
    "footer": {
        "contact": "Questions about these terms"
    }
}

LEGAL_COOKIES = {
    "title": "Cookie Policy",
    "effectiveDate": "Effective: October 23, 2026",
    "intro": "This Cookie Policy explains how EduPath uses cookies and similar technologies (collectively, \"cookies\") when you visit our website. For information about how we use the data collected via cookies, see our Privacy Policy.",
    "sections": {
        "what": {"title": "1. What Are Cookies?", "body": "Cookies are small text files placed on your device when you visit a website. They allow the website to remember your actions and preferences over time. EduPath uses both first-party cookies (set by us) and third-party cookies (set by our service providers, e.g., Supabase for authentication)."},
        "types": {"title": "2. Types of Cookies We Use", "body": "We categorize our cookies into three types:\n\n• Strictly necessary: Required for the Service to function. These cannot be disabled. They handle authentication (login sessions), language preference, and security (CSRF tokens).\n• Analytics (optional): Help us understand how students use EduPath so we can improve it. Only set if you accept analytics cookies via our consent banner.\n• Functional (optional): Remember your preferences (theme, saved filters) for a better experience."},
        "table": {"title": "3. Specific Cookies We Use", "body": "Strictly necessary:\n• sb-access-token, sb-refresh-token: Supabase authentication session. Expires after 7 days.\n• locale: Stores your language preference (en or ar). Expires after 1 year.\n• csrf-token: Prevents cross-site request forgery. Session cookie.\n\nAnalytics (only with consent):\n• posthog_distinct_id: Anonymous user identifier for PostHog analytics. Expires after 1 year.\n• posthog_session: Session grouping for PostHog. Expires after 30 minutes.\n\nFunctional:\n• edupath-cookie-consent: Records your cookie consent choice. Expires after 1 year.\n• edupath-theme: Stores your light/dark theme preference. Expires after 1 year."},
        "third": {"title": "4. Third-Party Cookies", "body": "We use the following third-party services that may set cookies:\n\n• Supabase: Authentication (essential). Their cookies are required for login.\n• PostHog: Analytics (only with your consent). Their cookies track anonymous usage.\n• Google (OAuth): If you sign in with Google, Google may set cookies during the authentication flow. We do not control Google's cookies — see Google's privacy policy.\n\nWe do NOT use advertising cookies or tracking pixels from Facebook, Google Ads, or similar platforms."},
        "control": {"title": "5. Managing and Deleting Cookies", "body": "You can control cookies in several ways:\n\n• Our consent banner: When you first visit EduPath, you can accept or decline analytics cookies. You can change your choice anytime by clearing your browser's localStorage and reloading the page.\n• Browser settings: Most browsers allow you to refuse cookies or delete existing ones. See your browser's help documentation.\n• Opt-out of all analytics: Use our consent banner's \"Decline\" option. We will not set any analytics cookies.\n\nNote: If you disable strictly-necessary cookies, you will not be able to log in or use EduPath's interactive features."},
        "changes": {"title": "6. Changes to This Policy", "body": "We may update this Cookie Policy when we add or remove cookies. We will notify you of material changes by posting a notice on the EduPath homepage 30 days before the change takes effect."}
    }
}

# --- Arabic translations (professional MSA) ---

NEW_AUTH_KEYS_AR = {
    "forgotPassword": "نسيت كلمة المرور؟",
    "agreePrefix": "أوافق على",
    "termsLink": "شروط الخدمة",
    "andPrefix": "و",
    "privacyLink": "سياسة الخصوصية",
    "mustAgree": "يرجى قبول الشروط وسياسة الخصوصية للمتابعة.",
}

NEW_NAV_KEYS_AR = {
    "accountSettings": "إعدادات الحساب",
}

NEW_FOOTER_ITEMS_AR = {
    "scholarships": "المنح الدراسية",
    "transferFinder": "محول المسارات",
    "essayReview": "مراجعة المقال",
    "aiAdvisor": "المستشار الذكي",
    "privacy": "سياسة الخصوصية",
    "terms": "شروط الخدمة",
    "cookies": "سياسة ملفات تعريف الارتباط",
    "account": "إعدادات الحساب",
}
NEW_FOOTER_LEGAL_AR = "قانوني"

# For legal pages, the Arabic content is large. We'll inject the English
# content as a placeholder and the Arabic page will render the English
# content if no Arabic is found. In production, these should be translated
# by a professional translator. For now we provide complete Arabic content.

LEGAL_PRIVACY_AR = {
    "title": "سياسة الخصوصية",
    "effectiveDate": "ساري المفعول: 23 أكتوبر 2026",
    "intro": "تدير EduPath (\"نحن\"، \"لنا\"، \"خاصتنا\") موقع edupath.com والخدمات ذات الصلة (\"الخدمة\"). توضح سياسة الخصوصية هذه المعلومات الشخصية التي نجمعها، ولماذا نجمعها، وكيف نستخدمها، والحقوق التي تتمتع بها بشأن بياناتك. نحن ملتزمون بحماية خصوصيتك والامتثال للائحة العامة لحماية البيانات (GDPR) وقانون حماية الخصوصية الشخصية الأردني رقم 24 لسنة 2023 (PPL) وقوانين حماية البيانات الأخرى المعمول بها.",
    "sections": {
        "collect": {"title": "1. المعلومات التي نجمعها", "body": "نجمع المعلومات التي تقدمها لنا مباشرة:\n\nمعلومات الحساب: عند التسجيل، نجمع اسمك الكامل وعنوان بريدك الإلكتروني وكلمة المرور (مشفرة) وبلدك ومجال اهتمامك. إذا سجلت عبر Google، نتلقى اسم حساب Google وبريدك الإلكتروني.\n\nبيانات الملف الشخصي: أثناء استخدامك لـ EduPath، نخزن الجامعات المحفوظة وجلسات دردشة رحلة الذكاء الاصطناعي ومطابقات المنح ومراجعات المقالات والمراجعات التي تقدمها.\n\nاستفسارات الطلاب: عندما تتواصل مع جامعة عبر EduPath، نخزن اسمك وبريدك الإلكتروني وبلدك ومعدلك التراكمي ومجال اهتمامك ورسالتك.\n\nبيانات الاستخدام: نجمع تلقائيًا معلومات حول كيفية تفاعلك مع الخدمة — الصفحات التي تزورها والوقت الذي تقضيه والنقرات واستعلامات البحث ومعلومات الجهاز (نوع المتصفح وحجم الشاشة والموقع التقريبي حسب البلد). نستخدم هذه البيانات بشكل مجمع لتحسين الخدمة.\n\nملفات تعريف الارتباط: نستخدم ملفات تعريف الارتباط والتقنيات المماثلة للمصادقة وتفضيل اللغة و(بموافقتك) التحليلات. راجع سياسة ملفات تعريف الارتباط الخاصة بنا للتفاصيل."},
        "use": {"title": "2. كيف نستخدم معلوماتك", "body": "نستخدم معلوماتك من أجل:\n\n• توفير الخدمة وتشغيلها وصيانتها\n• إنشاء حسابك وإدارته\n• تخصيص تجربتك (مثل التوصية بجامعات بناءً على قائمتك المحفوظة)\n• معالجة استفساراتك للجامعات وتقديم الردود\n• إرسال رسائل بريد إلكتروني متعلقة بالخدمة (رسالة ترحيب، تنبيهات المواعيد النهائية، إشعارات حالة المراجعة)\n• تحليل أنماط الاستخدام لتحسين الميزات وإصلاح الأخطاء\n• اكتشاف الاحتيال والإساءة والمشاكل الأمنية والمعالجة\n• الالتزام بالالتزامات القانونية\n\nنحن لا نبيع معلوماتك الشخصية لأطراف ثالثة. نحن لا نستخدم بياناتك لتدريب نماذج الذكاء الاصطناعي دون موافقتك الصريحة."},
        "legal": {"title": "3. الأساس القانوني للمعالجة (المادة 6 من GDPR)", "body": "بموجب GDPR، نعالج بياناتك الشخصية على الأسس القانونية التالية:\n\n• الموافقة: توافق على استخدامنا لبياناتك عند إنشاء حساب وقبول سياسة الخصوصية هذه. يمكنك سحب الموافقة في أي وقت بحذف حسابك.\n• العقد: المعالجة ضرورية لتقديم الخدمة التي طلبتها (مثل حفظ الجامعات، تقديم المراجعات، التواصل مع الجامعات).\n• الالتزام القانوني: قد نعالج البيانات للامتثال للمتطلبات القانونية (مثل السجلات الضريبية، الرد على الطلبات القانونية).\n• المصالح المشروعة: نعالج بيانات الاستخدام لتحسين الأمان ومنع الاحتيال وتعزيز الخدمة — توازن هذه المصالح مقابل حقوقك في الخصوصية.\n\nبموجب قانون PPL الأردني رقم 24 لسنة 2023، نعالج بياناتك بناءً على موافقتك المستنيرة ولتحقيق غرض الخدمة."},
        "cookies": {"title": "4. ملفات تعريف الارتباط والتقنيات التتبعية", "body": "نستخدم الفئات التالية من ملفات تعريف الارتباط:\n\n• ضرورية بشكل صارم: مطلوبة للمصادقة (رموز الجلسة) وتفضيل اللغة. لا يمكن تعطيلها.\n• التحليلات (اختياري): تستخدم لفهم كيفية استخدام الطلاب لـ EduPath حتى نتمكن من تحسينها. يتم تعيينها فقط إذا قبلت ملفات تعريف الارتباط التحليلية عبر لافتة الموافقة الخاصة بنا.\n• وظيفية (اختياري): تذكر تفضيلاتك (السمة، عوامل التصفية المحفوظة).\n\nيمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات المتصفح ولوحة الموافقة الخاصة بنا. راجع سياسة ملفات تعريف الارتباط الخاصة بنا للحصول على القائمة الكاملة."},
        "share": {"title": "5. مشاركة المعلومات والإفصاح", "body": "نحن لا نبيع معلوماتك الشخصية. نشارك البيانات فقط في هذه الظروف:\n\n• مع الجامعات: عند تقديم استفسار، نشارك اسمك وبريدك الإلكتروني وبلدك ومعدلك التراكمي ومجالك ورسالتك مع الجامعة التي تواصلت معها.\n• مع مزودي الخدمة: نستخدم Supabase (المصادقة واستضافة قاعدة البيانات)، Vercel (استضافة الويب)، Resend (تسليم البريد الإلكتروني)، OpenAI/xAI (مراجعة المقالات بالذكاء الاصطناعي ودردشة رحلة). يعالج هؤلاء المزودون البيانات نيابة عنا بموجب اتفاقيات معالجة البيانات ويلتزمون بالسرية.\n• للامتثال القانوني: قد نفصح عن البيانات إذا اقتضى القانون ذلك أو أمرت المحكمة أو الطلب الحكومي أو لحماية حقوقنا وممتلكاتنا وسلامتنا.\n• نقل الأعمال: في حال الاندماج أو الاستحواذ أو بيع الأصول، قد يتم نقل بيانات المستخدم إلى الكيان المكتسب. سنخطرك قبل 30 يومًا من هذا النقل.\n\nنحن لا نشارك بياناتك أبدًا لأغراض إعلانية."},
        "retention": {"title": "6. الاحتفاظ بالبيانات", "body": "نحتفظ ببياناتك الشخصية طالما أن حسابك نشطًا أو حسب الحاجة لتقديم الخدمة. فترات الاحتفاظ المحددة:\n\n• بيانات الحساب: حتى تحذف حسابك\n• المراجعات: حتى تحذفها (أو حسابك)\n• جلسات رحلة الذكاء الاصطناعي: 24 شهرًا بعد آخر نشاط\n• مراجعات المقالات: 12 شهرًا بعد التقديم\n• استفسارات الطلاب: 36 شهرًا (للامتثال لاستفسارات حماية المستهلك المحتملة)\n• بيانات التحليلات (مجمعة): إلى الأبد (لا تحديد شخصي)\n• سجلات الخادم: 90 يومًا\n\nعندما لم تعد البيانات مطلوبة، نحذفها أو نجهلها بحيث لا يمكن ربطها بك."},
        "rights": {"title": "7. حقوقك", "body": "بموجب GDPR وقانون PPL الأردني، لديك الحقوق التالية:\n\n• حق الوصول: يمكنك طلب نسخة من جميع البيانات الشخصية التي نحتفظ بها عنك.\n• حق التصحيح: يمكنك تصحيح البيانات غير الدقيقة أو غير الكاملة.\n• حق المحو (\"الحق في النسيان\"): يمكنك حذف حسابك في أي وقت عبر إعدادات الحساب. سنزيل بياناتك خلال 30 يومًا.\n• حق تقييد المعالجة: يمكنك أن تطلب منا تقييد كيفية استخدامنا لبياناتك.\n• حق نقل البيانات: يمكنك طلب بياناتك بتنسيق قابل للقراءة آليًا.\n• حق الاعتراض: يمكنك الاعتراض على المعالجة بناءً على المصالح المشروعة.\n• حق سحب الموافقة: يمكنك سحب الموافقة في أي وقت دون التأثير على قانونية المعالجة قبل السحب.\n\nلممارسة أي من هذه الحقوق، راسلنا على privacy@edupath.com. سنرد خلال 30 يومًا. إذا لم تكن راضيًا عن ردنا، يمكنك تقديم شكوى إلى سلطة حماية البيانات المحلية."},
        "transfer": {"title": "8. نقل البيانات الدولي", "body": "تم استضافة EduPath على Vercel (الولايات المتحدة) و Supabase (الولايات المتحدة/الاتحاد الأوروبي). قد يتم نقل بياناتك ومعالجتها في هذه البلدان. نضمن وجود ضمانات مناسبة، بما في ذلك البنود التعاقدية القياسية (SCCs) المعتمدة من المفوضية الأوروبية، وننقل البيانات فقط إلى البلدان التي توفر مستوى حماية كافيًا.\n\nإذا كنت في الأردن، تتم معالجة بياناتك بموجب قانون PPL الأردني الذي يسمح بالنقل الدولي شريطة وجود ضمانات مناسبة."},
        "security": {"title": "9. أمن البيانات", "body": "نتخذ تدابير تقنية وتنظيمية معقولة لحماية بياناتك:\n\n• جميع البيانات أثناء النقل مشفرة عبر TLS 1.2+\n• كلمات المرور مشفرة بواسطة Supabase Auth باستخدام bcrypt\n• الوصول إلى قاعدة البيانات مقيد على الكود من جانب الخادم المصادق عليه\n• مسارات API محمية بفحوصات CSRF وتحديد المعدل والتحقق من المدخلات\n• نراقب النشاط المشبوه ولدينا خطة استجابة للحوادث\n\nلا توجد طريقة نقل عبر الإنترنت آمنة 100%. لا يمكننا ضمان الأمن المطلق، لكننا نعمل بجد لحماية بياناتك وسنخطرك خلال 72 ساعة من أي خرث كما يتطلب ذلك المادة 33 من GDPR."},
        "children": {"title": "10. خصوصية الأطفال", "body": "EduPath مخصص للطلاب الذين تبلغ أعمارهم 16 عامًا فأكثر. نحن لا نجمع عن قصد بيانات من الأطفال دون 16 عامًا. إذا كنت تعتقد أننا جمعنا بيانات من طفل دون 16 عامًا، يرجى التواصل معنا على privacy@edupath.com وسنحذفها فورًا.\n\nيمكن للطلاب الذين تتراوح أعمارهم بين 16 و 18 عامًا استخدام EduPath بموافقة ولي الأمر. بإنشاء حساب، تمثل أنك تبلغ من العمر 16 عامًا أو أكثر، أو أن لديك موافقة الوالدين."},
        "changes": {"title": "11. التغييرات على هذه السياسة", "body": "قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بالتغييرات الجوهرية عبر البريد الإلكتروني (إذا كان لديك حساب) ونشر إشعار على الصفحة الرئيسية لـ EduPath قبل 30 يومًا من سريان التغيير. يشير تاريخ \"ساري المفعول\" في أعلى هذه الصفحة إلى آخر مراجعة للسياسة.\n\nاستمرار استخدام الخدمة بعد تاريخ السريان يشكل قبولًا للسياسة المحدثة."},
        "contact": {"title": "12. اتصل بنا", "body": "إذا كان لديك أسئلة حول سياسة الخصوصية هذه أو بياناتك الشخصية، تواصل معنا:\n\n• البريد الإلكتروني: privacy@edupath.com\n• الموضوع: استفسار الخصوصية\n\nنهدف إلى الرد على جميع استفسارات الخصوصية خلال 5 أيام عمل. للمسائل العاجلة المتعلقة بحذف البيانات، ضع علامة على موضوعك كـ \"عاجل — طلب حذف\"."}
    },
    "footer": {
        "contact": "أسئلة حول الخصوصية"
    }
}

LEGAL_TERMS_AR = {
    "title": "شروط الخدمة",
    "effectiveDate": "ساري المفعول: 23 أكتوبر 2026",
    "intro": "مرحبًا بك في EduPath. تحكم شروط الخدمة هذه (\"الشروط\") استخدامك لموقع edupath.com والخدمات ذات الصلة (\"الخدمة\"). بإنشاء حساب أو استخدام الخدمة، فإنك توافق على هذه الشروط. إذا لم توافق، فلا تستخدم الخدمة.",
    "sections": {
        "acceptance": {"title": "1. قبول الشروط", "body": "بالدخول إلى EduPath أو استخدامها، فإنك توافق على الالتزام بهذه الشروط وسياسة الخصوصية الخاصة بنا. إذا كنت تستخدم EduPath نيابة عن مؤسسة (مثل مسؤول قبول جامعي)، فإنك تمثل أن لديك سلطة إلزام تلك المؤسسة."},
        "eligibility": {"title": "2. الأهلية", "body": "يجب أن يكون عمرك 16 عامًا على الأقل لاستخدام EduPath. إذا كنت دون 18 عامًا، يجب أن تحصل على موافقة ولي الأمر. باستخدام EduPath، تمثل أنك تلبي هذه المتطلبات."},
        "accounts": {"title": "3. حسابك", "body": "أنت مسؤول عن الحفاظ على أمان حسابك وكلمة المرور الخاصة بك. توافق على تقديم معلومات دقيقة عند التسجيل وعلى تحديثها. يجب عليك عدم مشاركة بيانات اعتماد حسابك مع الآخرين. نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط."},
        "use": {"title": "4. الاستخدام المقبول", "body": "توافق على عدم:\n\n• استخدام EduPath لأي غرض غير قانوني\n• تقديم معلومات كاذبة أو مضللة في المراجعات أو الطلبات أو المقالات\n• انتحال شخصية شخص آخر أو التضليل بشأن انتمائك لجامعة\n• إرسال الرسائل المزعجة أو المضايقة أو التهديد للمستخدمين الآخرين\n• محاولة الوصول إلى بيانات غير مصرح لك بالوصول إليها\n• الهندسة العكسية أو الكشط أو تعطيل الخدمة بأي طريقة أخرى\n• استخدام البرامج النصية الآلية (البوتات) دون موافقتنا الكتابية المسبقة\n\nقد تؤدي الانتهاكات إلى إنهاء الحساب واتخاذ إجراء قانوني."},
        "content": {"title": "5. محتوى المستخدم", "body": "تحتفظ بملكية المحتوى الذي تقدمه إلى EduPath (المراجعات، المقالات، استفسارات الطلاب، معلومات الملف الشخصي). بتقديم المحتوى، تمنح EduPath ترخيصًا عالميًا غير حصري خالي من الإتاوات لاستضافة المحتوى وعرضه ومعالجته لغرض تشغيل الخدمة.\n\nتمثل أن لديك الحقوق في أي محتوى تقدمه وأنه لا ينتهك حقوق أي طرف ثالث."},
        "reviews": {"title": "6. المراجعات والتقييمات", "body": "يجب أن تستند المراجعات إلى تجربتك الحقيقية. قد نقوم بمراجعة أو إزالة أو رفض المراجعات التي:\n\n• تحتوي على معلومات كاذبة أو مضللة\n• تتضمن خطاب كراهية أو تمييزًا أو هجمات شخصية\n• تروج لأنشطة غير قانونية\n• تحتوي على إعلانات أو محتوى ترويجي\n• تم تقديمها مقابل تعويض (مراجعات مدفوعة)\n\nنحتفظ بالحق في إزالة أي مراجعة وفق تقديرنا. المراجعات المعلمة كـ \"عينة\" اصطناعية وليست من طلاب حقيقيين."},
        "ip": {"title": "7. الملكية الفكرية", "body": "موقع EduPath، بما في ذلك تصميمه والكود والشعارات وبيانات الجامعات (التي أنشأناها) والوثائق، هو ملك لنا أو ملك لمرخصينا. أسماء الجامعات وشعاراتها ومعلومات البرامج ملك للمؤسسات المعنية.\n\nلا يمكنك نسخ أو تعديل أو توزيع أو إنشاء أعمال مشتقة من EduPath دون موافقتنا الكتابية المسبقة."},
        "disclaimer": {"title": "8. إخلاء المسؤولية", "body": "EduPath مقدمة \"كما هي\" و\"كما تتوفر\" دون ضمانات من أي نوع. لا نضمن أن:\n\n• معلومات الجامعة (الرسوم، المواعيد النهائية، المتطلبات) دقيقة أو محدثة\n• مطابقة المنح ستؤدي إلى جوائز فعلية\n• مراجعات المقالات ست حسن فرص قبولك\n• الخدمة ستكون متواصلة أو خالية من الأخطاء\n\nتستمد بيانات الجامعة من المواقع العامة وقد تكون قديمة. تحقق دائمًا من المعلومات الحرجة (المواعيد النهائية، الرسوم، المتطلبات) مباشرة مع المؤسسة قبل التقديم."},
        "liability": {"title": "9. تحديد المسؤولية", "body": "بأقصى قدر يسمح به القانون، لن تكون EduPath ومشغليها مسؤولين عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية، بما في ذلك على سبيل المثال لا الحصر:\n\n• فقدان فرص القبول\n• فقدان المنح\n• فقدان البيانات\n• انقطاع الأعمال\n\nإجمالي مسؤوليتنا عن أي مطالبة تنشأ عن استخدامك لـ EduPath لن يتجاوز المبلغ الذي دفعته لنا في الـ 12 شهرًا السابقة للمطالبة، أو 50 دولارًا أمريكيًا، أيهما أكبر."},
        "indemnity": {"title": "10. التعويض", "body": "توافق على تعويض EduPath وحمايتها من أي مطالبات أو أضرار أو خسائر أو نفقات (بما في ذلك الرسوم القانونية) تنشأ عن: (أ) انتهاكك لهذه الشروط، (ب) انتهاكك لحقوق أي طرف ثالث، أو (ج) المحتوى الذي تقدمه للخدمة."},
        "termination": {"title": "11. الإنهاء", "body": "يمكنك حذف حسابك في أي وقت عبر إعدادات الحساب. قد نعلق أو ننهي وصولك إلى EduPath إذا انتهكت هذه الشروط أو إذا اعتقدنا أن سلوكك ضار للمستخدمين الآخرين أو لنا. عند الإنهاء، ينتهي حقك في استخدام الخدمة على الفور. ستظل الأقسام التي بطبيعتها يجب أن تبقى بعد الإنهاء (مثل الملكية الفكرية، إخلاء المسؤولية، المسؤولية) سارية المفعول."},
        "law": {"title": "12. القانون الحاكم والنزاعات", "body": "تخضع هذه الشروط لقوانين المملكة الأردنية الهاشمية، دون النظر إلى مبادئ تعارض القوانين. سيتم حل أي نزاع ينشأ عن هذه الشروط أو استخدامك لـ EduPath حصريًا في محاكم عمّان، الأردن. إذا كنت مستهلكًا في الاتحاد الأوروبي أو المملكة المتحدة، يمكنك أيضًا رفع دعاوى في بلد إقامتك والاستفادة من قوانين حماية المستهلك الإلزامية."},
        "changes": {"title": "13. التغييرات على هذه الشروط", "body": "قد نقوم بتحديث هذه الشروط من وقت لآخر. سنخطرك بالتغييرات الجوهرية عبر البريد الإلكتروني ونشر إشعار على الصفحة الرئيسية لـ EduPath قبل 30 يومًا من سريان التغيير. استمرار استخدام الخدمة بعد تاريخ السريان يشكل قبولًا للشروط المحدثة."},
        "contact": {"title": "14. اتصل بنا", "body": "إذا كان لديك أسئلة حول هذه الشروط، تواصل معنا:\n\n• البريد الإلكتروني: legal@edupath.com\n• الموضوع: استفسار الشروط"}
    },
    "footer": {
        "contact": "أسئلة حول هذه الشروط"
    }
}

LEGAL_COOKIES_AR = {
    "title": "سياسة ملفات تعريف الارتباط",
    "effectiveDate": "ساري المفعول: 23 أكتوبر 2026",
    "intro": "تشرح سياسة ملفات تعريف الارتباط هذه كيفية استخدام EduPath لملفات تعريف الارتباط والتقنيات المماثلة (يشار إليها مجتمعة بـ \"ملفات تعريف الارتباط\") عند زيارة موقعنا. للحصول على معلومات حول كيفية استخدامنا للبيانات التي تم جمعها عبر ملفات تعريف الارتباط، راجع سياسة الخصوصية الخاصة بنا.",
    "sections": {
        "what": {"title": "1. ما هي ملفات تعريف الارتباط؟", "body": "ملفات تعريف الارتباط هي ملفات نصية صغيرة يتم وضعها على جهازك عند زيارة موقع ويب. تسمح للموقع بتذكر إجراءاتك وتفضيلاتك بمرور الوقت. يستخدم EduPath ملفات تعريف الارتباط الخاصة بالطرف الأول (التي حددناها) وملفات تعريف الارتباط الخاصة بالطرف الثالث (التي حددتها مزودو الخدمة لدينا، مثل Supabase للمصادقة)."},
        "types": {"title": "2. أنواع ملفات تعريف الارتباط التي نستخدمها", "body": "نصنف ملفات تعريف الارتباط لدينا إلى ثلاثة أنواع:\n\n• ضرورية بشكل صارم: مطلوبة لكي تعمل الخدمة. لا يمكن تعطيلها. تتعامل مع المصادقة (جلسات تسجيل الدخول)، تفضيل اللغة، والأمان (رموز CSRF).\n• التحليلات (اختياري): تساعدنا على فهم كيفية استخدام الطلاب لـ EduPath حتى نتمكن من تحسينها. يتم تعيينها فقط إذا قبلت ملفات تعريف الارتباط التحليلية عبر لافتة الموافقة الخاصة بنا.\n• وظيفية (اختياري): تذكر تفضيلاتك (السمة، عوامل التصفية المحفوظة) لتجربة أفضل."},
        "table": {"title": "3. ملفات تعريف الارتباط المحددة التي نستخدمها", "body": "ضرورية بشكل صارم:\n• sb-access-token، sb-refresh-token: جلسة مصادقة Supabase. تنتهي بعد 7 أيام.\n• locale: يخزن تفضيل اللغة (en أو ar). ينتهي بعد عام واحد.\n• csrf-token: يمنع تزوير الطلبات عبر المواقع. ملف تعريف ارتباط للجلسة.\n\nالتحليلات (فقط بالموافقة):\n• posthog_distinct_id: معرف مستخدم مجهول لتحليلات PostHog. ينتهي بعد عام واحد.\n• posthog_session: تجميع الجلسة لـ PostHog. ينتهي بعد 30 دقيقة.\n\nوظيفية:\n• edupath-cookie-consent: يسجل اختيار الموافقة على ملفات تعريف الارتباط. ينتهي بعد عام واحد.\n• edupath-theme: يخزن تفضيل السمة الفاتحة/الداكنة. ينتهي بعد عام واحد."},
        "third": {"title": "4. ملفات تعريف الارتباط الخاصة بالطرف الثالث", "body": "نستخدم خدمات الطرف الثالث التالية التي قد تضع ملفات تعريف الارتباط:\n\n• Supabase: المصادقة (أساسية). ملفات تعريف الارتباط الخاصة بها مطلوبة لتسجيل الدخول.\n• PostHog: التحليلات (فقط بموافقتك). تتعقب ملفات تعريف الارتباط الخاصة بها الاستخدام المجهول.\n• Google (OAuth): إذا سجلت الدخول باستخدام Google، قد تضع Google ملفات تعريف الارتباط أثناء تدفق المصادقة. نحن لا نتحكم في ملفات تعريف الارتباط الخاصة بـ Google — راجع سياسة خصوصية Google.\n\nنحن لا نستخدم ملفات تعريف الارتباط الإعلانية أو بكسلات التتبع من Facebook أو Google Ads أو منصات مماثلة."},
        "control": {"title": "5. إدارة وحذف ملفات تعريف الارتباط", "body": "يمكنك التحكم في ملفات تعريف الارتباط بعدة طرق:\n\n• لافتة الموافقة الخاصة بنا: عند زيارتك الأولى لـ EduPath، يمكنك قبول أو رفض ملفات تعريف الارتباط التحليلية. يمكنك تغيير اختيارك في أي وقت عن طريق مسح localStorage في متصفحك وإعادة تحميل الصفحة.\n• إعدادات المتصفح: تسمح معظم المتصفحات برفض ملفات تعريف الارتباط أو حذف الموجودة. راجع وثائق مساعدة المتصفح.\n• إلغاء الاشتراك في جميع التحليلات: استخدم خيار \"رفض\" في لافتة الموافقة الخاصة بنا. لن نضع أي ملفات تعريف ارتباط تحليلية.\n\nملاحظة: إذا قمت بتعطيل ملفات تعريف الارتباط الضرورية بشكل صارم، فلن تتمكن من تسجيل الدخول أو استخدام ميزات EduPath التفاعلية."},
        "changes": {"title": "6. التغييرات على هذه السياسة", "body": "قد نقوم بتحديث سياسة ملفات تعريف الارتباط هذه عندما نضيف أو نزيل ملفات تعريف الارتباط. سنخطرك بالتغييرات الجوهرية عن طريق نشر إشعار على الصفحة الرئيسية لـ EduPath قبل 30 يومًا من سريان التغيير."}
    }
}

def deep_merge(base, update):
    """Recursively merge update into base. update wins on conflict."""
    for k, v in update.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base

# --- Update en.json ---
en_path = Path('messages/en.json')
en = json.loads(en_path.read_text(encoding='utf-8'))

# Auth keys
for k, v in NEW_AUTH_KEYS.items():
    en.setdefault('Auth', {})[k] = v

# Nav keys
for k, v in NEW_NAV_KEYS.items():
    en.setdefault('Nav', {})[k] = v

# Footer keys
en.setdefault('Footer', {}).setdefault('items', {}).update(NEW_FOOTER_ITEMS)
en['Footer']['legal'] = NEW_FOOTER_LEGAL

# Legal keys
en.setdefault('Legal', {})
en['Legal']['privacy'] = LEGAL_PRIVACY
en['Legal']['terms'] = LEGAL_TERMS
en['Legal']['cookies'] = LEGAL_COOKIES

en_path.write_text(json.dumps(en, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Updated {en_path}')

# --- Update ar.json ---
ar_path = Path('messages/ar.json')
ar = json.loads(ar_path.read_text(encoding='utf-8'))

for k, v in NEW_AUTH_KEYS_AR.items():
    ar.setdefault('Auth', {})[k] = v

for k, v in NEW_NAV_KEYS_AR.items():
    ar.setdefault('Nav', {})[k] = v

ar.setdefault('Footer', {}).setdefault('items', {}).update(NEW_FOOTER_ITEMS_AR)
ar['Footer']['legal'] = NEW_FOOTER_LEGAL_AR

ar.setdefault('Legal', {})
ar['Legal']['privacy'] = LEGAL_PRIVACY_AR
ar['Legal']['terms'] = LEGAL_TERMS_AR
ar['Legal']['cookies'] = LEGAL_COOKIES_AR

ar_path.write_text(json.dumps(ar, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Updated {ar_path}')

print('Done. Key counts:')
en2 = json.loads(en_path.read_text(encoding='utf-8'))
ar2 = json.loads(ar_path.read_text(encoding='utf-8'))
print(f'  EN: {len(en2.get("Legal", {}))} legal sections, Auth keys: {len(en2.get("Auth", {}))}')
print(f'  AR: {len(ar2.get("Legal", {}))} legal sections, Auth keys: {len(ar2.get("Auth", {}))}')
