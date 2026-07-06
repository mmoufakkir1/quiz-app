import fs from 'node:fs'

const flashcardData = JSON.parse(fs.readFileSync('public/flashcards.json', 'utf8'))
const flashcardTerms = new Set(flashcardData.flashcards.map((card) => card.term.trim().toLowerCase()))
const flashcardByTerm = new Map(
  flashcardData.flashcards.map((card) => [card.term.trim().toLowerCase(), card]),
)

function isBoilerplateExample(text) {
  return /A security (team|analyst) is (reviewing|documenting)/i.test(text || '')
}

function isDomainOnlyKeyDetails(text) {
  const trimmed = (text || '').trim()
  return /^\d+\.\d+ [^.]+\.$/.test(trimmed) || /^\d+\.\d+ /.test(trimmed) && trimmed.length < 80
}

function buildTermExplanation(entry) {
  if (entry.explanation?.trim()) {
    return entry.explanation.trim()
  }

  const card = flashcardByTerm.get(entry.term.trim().toLowerCase())
  const parts = []

  if (card?.definition?.trim()) {
    parts.push(card.definition.trim())
  }

  const keyDetails = card?.keyDetails?.trim()
  if (keyDetails && !isDomainOnlyKeyDetails(keyDetails)) {
    parts.push(keyDetails)
  }

  const example = card?.example?.trim()
  if (example && !isBoilerplateExample(example)) {
    parts.push(example)
  }

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return entry.memorize.trim()
}

const TOPICS = [
  {
    path: 'Confidentiality, Integrity, and Availability (CIA)',
    domain: '1.0 General Security Concepts',
    summary: 'Core triad every control supports; know what each pillar protects and typical failures.',
    terms: [
      { term: 'Confidentiality', memorize: 'Only authorized users can read data (encryption, access controls).' },
      { term: 'Integrity', memorize: 'Data is accurate and unaltered (hashing, FIM, change control).' },
      { term: 'Availability', memorize: 'Systems and data accessible when needed (HA, backups, DDoS mitigation).' },
      { term: 'Defense in depth', memorize: 'Layered controls so one failure does not collapse security.' },
      { term: 'DLP', memorize: 'Data loss prevention monitors and blocks sensitive data movement.' },
      { term: 'Fail-open', memorize: 'Access allowed when control fails — favors availability.' },
      { term: 'Fail-closed', memorize: 'Access denied when control fails — favors confidentiality/integrity.' },
    ],
  },
  {
    path: 'Non-repudiation',
    domain: '1.0 General Security Concepts',
    summary: 'Prove who did what and that they cannot deny it later.',
    terms: [
      { term: 'Digital signature', memorize: 'Uses asymmetric crypto to prove origin and integrity.' },
      { term: 'Hashing', memorize: 'Fixed-length digest proves content was not changed.' },
      { term: 'Audit logs', memorize: 'Timestamped records support accountability.' },
      { term: 'Accounting', memorize: 'AAA component that tracks user actions.' },
      { term: 'Blockchain', memorize: 'Distributed ledger can provide tamper-evident records.' },
    ],
  },
  {
    path: 'Authentication, Authorization, and Accounting (AAA)',
    domain: '1.0 General Security Concepts',
    summary: 'Identity lifecycle: prove who you are, what you may do, and what you did.',
    terms: [
      { term: 'AAA', memorize: 'Authentication, Authorization, Accounting.' },
      { term: 'Authentication', memorize: 'Verifies identity (password, MFA, biometrics).' },
      { term: 'Authorization', memorize: 'Determines permitted resources/actions after auth.' },
      { term: 'Accounting', memorize: 'Logs and reviews actions for auditing.' },
      { term: 'RADIUS', memorize: 'AAA for network access; UDP 1812/1813.' },
      { term: 'TACACS+', memorize: 'Cisco AAA; encrypts entire payload; TCP 49.' },
      { term: 'Kerberos', memorize: 'Ticket-based auth using KDC; mutual authentication.' },
      { term: 'LDAP', memorize: 'Directory protocol for identity lookups.' },
    ],
  },
  {
    path: 'Gap analysis',
    domain: '1.0 General Security Concepts',
    summary: 'Compare current state to desired state to find security shortfalls.',
    terms: [
      { term: 'Gap analysis', memorize: 'Identifies missing controls between baseline and target.' },
      { term: 'Baseline configuration', memorize: 'Known-good standard to compare against.' },
      { term: 'Secure baseline', memorize: 'Hardened reference image or config.' },
      { term: 'Compliance assessment', memorize: 'Checks practices against laws, standards, policies.' },
      { term: 'Vulnerability scan', memorize: 'Finds technical weaknesses to close gaps.' },
    ],
  },
  {
    path: 'Zero Trust',
    domain: '1.0 General Security Concepts',
    summary: 'Never trust, always verify — assume breach; authenticate every request.',
    terms: [
      { term: 'Zero trust', memorize: 'Verify explicitly; least privilege; assume breach.' },
      { term: 'Microsegmentation', memorize: 'Granular network isolation limits lateral movement.' },
      { term: 'ZTNA', memorize: 'Zero Trust Network Access replaces implicit VPN trust.' },
      { term: 'SASE', memorize: 'Secure Access Service Edge — cloud-delivered ZT networking.' },
      { term: 'Continuous validation', memorize: 'Re-check identity and device health per session.' },
      { term: 'Least privilege', memorize: 'Minimum access required for the task.' },
    ],
  },
  {
    path: 'Security Controls > Categories',
    domain: '1.0 General Security Concepts',
    summary: 'Administrative, technical, and physical groupings of controls.',
    terms: [
      { term: 'Administrative control', memorize: 'Policies, training, procedures, risk management.' },
      { term: 'Technical control', memorize: 'Technology: firewall, encryption, IDS, MFA.' },
      { term: 'Physical control', memorize: 'Locks, guards, CCTV, mantraps, badges.' },
      { term: 'Operational control', memorize: 'Day-to-day people/process security work.' },
      { term: 'Directive control', memorize: 'Policy that directs expected behavior.' },
    ],
  },
  {
    path: 'Security Controls > Control types',
    domain: '1.0 General Security Concepts',
    summary: 'What controls do by function: prevent, detect, correct, deter.',
    terms: [
      { term: 'Preventive control', memorize: 'Stops incident before it occurs (firewall, MFA).' },
      { term: 'Detective control', memorize: 'Identifies events (IDS, logs, CCTV).' },
      { term: 'Corrective control', memorize: 'Restores systems after incident (backups, patches).' },
      { term: 'Deterrent control', memorize: 'Discourages attack (warning banners, guards).' },
      { term: 'Compensating control', memorize: 'Alternative when primary control cannot be used.' },
      { term: 'Physical control', memorize: 'Protects facilities and hardware.' },
    ],
  },
  {
    path: 'Threat actors',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Know actor types and typical capabilities.',
    terms: [
      { term: 'Script kiddie', memorize: 'Low skill; uses existing tools.' },
      { term: 'Hacktivist', memorize: 'Ideologically motivated disruption.' },
      { term: 'Organized crime', memorize: 'Financially motivated, capable.' },
      { term: 'Nation-state', memorize: 'High capability and resources; APT.' },
      { term: 'Insider threat', memorize: 'Trusted user misusing access.' },
      { term: 'APT', memorize: 'Advanced persistent threat; long-term targeted campaign.' },
      { term: 'Unskilled attacker', memorize: 'Opportunistic, limited technique.' },
    ],
  },
  {
    path: 'Attributes of actors',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Internal vs external, skill level, resources, intent.',
    terms: [
      { term: 'Internal actor', memorize: 'Inside organization; knows systems.' },
      { term: 'External threat actor with high capability and high resources', memorize: 'Outside attacker with advanced tools.' },
      { term: 'Attributes of actors', memorize: 'Internal/external, capability, intent, funding.' },
      { term: 'Threat intelligence', memorize: 'Context on actors, TTPs, and IOCs.' },
      { term: 'IOC', memorize: 'Indicator of compromise — artifact of intrusion.' },
    ],
  },
  {
    path: 'Motivations',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Why attacks happen: money, espionage, disruption, ideology.',
    terms: [
      { term: 'Financial gain', memorize: 'Ransomware, fraud, data theft for sale.' },
      { term: 'Espionage', memorize: 'Steal secrets for competitive or state advantage.' },
      { term: 'Disruption', memorize: 'DDoS, sabotage, hacktivism.' },
      { term: 'Revenge', memorize: 'Disgruntled insider or personal grievance.' },
      { term: 'Notoriety', memorize: 'Attention-seeking defacements or leaks.' },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Message-based',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Email, SMS, IM, and messaging as delivery channels.',
    terms: [
      { term: 'Phishing', memorize: 'Fraudulent messages trick users into revealing data.' },
      { term: 'Spear phishing', memorize: 'Targeted phishing at specific individuals.' },
      { term: 'Whaling', memorize: 'Phishing aimed at executives.' },
      { term: 'Vishing', memorize: 'Voice phishing by phone.' },
      { term: 'Smishing', memorize: 'SMS/text phishing.' },
      { term: 'SPIM', memorize: 'Spam over instant messaging.' },
      { term: 'Business email compromise', memorize: 'Impersonation to redirect payments or data.' },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Vulnerable software',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Flaws in code, libraries, and unpatched applications.',
    terms: [
      { term: 'Buffer overflow', memorize: 'Extra input overwrites memory; may execute code.' },
      { term: 'SQL injection', memorize: 'Malicious SQL in input manipulates database.' },
      { term: 'Cross-site scripting (XSS)', memorize: 'Malicious script runs in victim browser.' },
      { term: 'Zero-day vulnerability', memorize: 'Unknown flaw with no vendor patch yet.' },
      { term: 'CVE', memorize: 'Standard identifier for public vulnerabilities.' },
      { term: 'Application-level vulnerability', memorize: 'Flaw in app code or logic.' },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Vulnerable software > Unsupported systems and applications',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'EOL software no longer receives security fixes.',
    terms: [
      { term: 'EOL', memorize: 'End of life — no patches; high risk.' },
      { term: 'Unsupported systems and applications', memorize: 'Legacy OS/apps without vendor support.' },
      { term: 'Virtual patching', memorize: 'WAF/IPS rule blocks exploit until real patch.' },
      { term: 'Compensating control', memorize: 'Isolation or monitoring when upgrade impossible.' },
      { term: 'System hardening', memorize: 'Remove unused services to shrink attack surface.' },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Unsecure networks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Weak Wi-Fi, open ports, misconfigured protocols.',
    terms: [
      { term: 'Rogue access point', memorize: 'Unauthorized AP on corporate network.' },
      { term: 'Evil twin', memorize: 'Fake AP mimicking legitimate SSID.' },
      { term: 'On-path attack', memorize: 'MITM intercepts or alters traffic.' },
      { term: 'Replay attack', memorize: 'Reuses captured valid transmission.' },
      { term: 'Open port', memorize: 'Unnecessary exposed service increases risk.' },
      { term: 'War driving', memorize: 'Scanning for wireless networks from vehicle.' },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Supply chain',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Third-party vendors, software dependencies, hardware tampering.',
    terms: [
      { term: 'Supply chain attack', memorize: 'Compromise via vendor, update, or component.' },
      { term: 'Third-party risk', memorize: 'Vendor access or code introduces exposure.' },
      { term: 'SBOM', memorize: 'Software bill of materials lists components.' },
      { term: 'Vendor assessment', memorize: 'Evaluate security before onboarding supplier.' },
      { term: 'Tampering', memorize: 'Unauthorized modification of hardware or software.' },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Human vectors/social engineering',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Manipulating people to bypass technical controls.',
    terms: [
      { term: 'Social engineering', memorize: 'Psychological manipulation to gain access.' },
      { term: 'Pretexting', memorize: 'Fabricated scenario to extract information.' },
      { term: 'Baiting', memorize: 'Tempting item (USB drop) to trigger curiosity.' },
      { term: 'Tailgating', memorize: 'Following authorized person through secure door.' },
      { term: 'Shoulder surfing', memorize: 'Observing credentials or data visually.' },
      { term: 'Dumpster diving', memorize: 'Recovering sensitive info from discarded materials.' },
      { term: 'Watering hole', memorize: 'Compromise site frequented by targets.' },
      { term: 'Honeytoken', memorize: 'Fake credential/data to detect misuse.' },
    ],
  },
  {
    path: 'Cryptographic Solutions > Public key infrastructure (PKI)',
    domain: '1.0 General Security Concepts',
    summary: 'Trust framework for certificates and public-key crypto.',
    terms: [
      { term: 'PKI', memorize: 'Framework of CAs, certificates, and revocation.' },
      { term: 'Certificate authority', memorize: 'Issues and signs digital certificates.' },
      { term: 'CRL', memorize: 'Certificate Revocation List of revoked certs.' },
      { term: 'OCSP', memorize: 'Online real-time certificate status check.' },
      { term: 'Root of trust', memorize: 'Top-level CA anchors certificate chain.' },
      { term: 'Key escrow', memorize: 'Stored copy of keys for recovery/lawful access.' },
    ],
  },
  {
    path: 'Cryptographic Solutions > Encryption',
    domain: '1.0 General Security Concepts',
    summary: 'Symmetric vs asymmetric; data at rest and in transit.',
    terms: [
      { term: 'Symmetric encryption', memorize: 'Same key encrypts and decrypts (AES).' },
      { term: 'Asymmetric encryption', memorize: 'Public/private key pair (RSA, ECC).' },
      { term: 'AES', memorize: 'Advanced Encryption Standard; symmetric block cipher.' },
      { term: 'RSA', memorize: 'Asymmetric algorithm for encryption and signatures.' },
      { term: 'TLS', memorize: 'Encrypts data in transit (HTTPS).' },
      { term: 'IPsec', memorize: 'Encrypts/authenticates IP packets (VPN).' },
      { term: 'FDE', memorize: 'Full disk encryption protects data at rest.' },
      { term: 'Database encryption', memorize: 'Protects stored records and fields.' },
    ],
  },
  {
    path: 'Cryptographic Solutions > Hashing',
    domain: '1.0 General Security Concepts',
    summary: 'One-way digests for integrity, not confidentiality.',
    terms: [
      { term: 'Hashing', memorize: 'Fixed-length digest; one-way function.' },
      { term: 'SHA', memorize: 'Secure Hash Algorithm family (SHA-256).' },
      { term: 'MD5', memorize: 'Legacy hash; collision weaknesses — avoid.' },
      { term: 'Hash collision', memorize: 'Two inputs produce same hash.' },
      { term: 'HMAC', memorize: 'Hash with secret key for integrity/authentication.' },
      { term: 'Digital signature', memorize: 'Hash encrypted with private key.' },
    ],
  },
  {
    path: 'Cryptographic Solutions > Tools',
    domain: '1.0 General Security Concepts',
    summary: 'HSM, TPM, crypto libraries, and key managers.',
    terms: [
      { term: 'HSM', memorize: 'Hardware Security Module stores keys in tamper-resistant hardware.' },
      { term: 'TPM', memorize: 'Trusted Platform Module — chip for keys and attestation.' },
      { term: 'Key management system', memorize: 'Central lifecycle for generation, rotation, destruction.' },
      { term: 'OpenSSL', memorize: 'Common crypto library for TLS and certs.' },
      { term: 'PGP', memorize: 'Pretty Good Privacy for email/file encryption.' },
    ],
  },
  {
    path: 'Cryptographic Solutions > Certificates',
    domain: '1.0 General Security Concepts',
    summary: 'X.509 certs bind identity to public key.',
    terms: [
      { term: 'Digital certificate', memorize: 'Binds identity to public key; signed by CA.' },
      { term: 'Self-signed certificate', memorize: 'Signed by same entity; limited trust.' },
      { term: 'Wildcard certificate', memorize: 'Covers subdomains (*.example.com).' },
      { term: 'Certificate pinning', memorize: 'App trusts only specific cert/public key.' },
      { term: 'S/MIME', memorize: 'Email signing and encryption using certs.' },
    ],
  },
  {
    path: 'Cryptographic Solutions > Obfuscation',
    domain: '1.0 General Security Concepts',
    summary: 'Hiding data purpose — not a substitute for encryption.',
    terms: [
      { term: 'Obfuscation', memorize: 'Makes data/code harder to understand.' },
      { term: 'Data masking', memorize: 'Hides part of sensitive field for display.' },
      { term: 'Tokenization', memorize: 'Replaces sensitive data with non-sensitive token.' },
      { term: 'Steganography', memorize: 'Hides data inside other files.' },
      { term: 'Encoding', memorize: 'Base64 etc. — not encryption.' },
    ],
  },
  {
    path: 'Cryptographic Solutions > Salting',
    domain: '1.0 General Security Concepts',
    summary: 'Random data added before hashing passwords.',
    terms: [
      { term: 'Salting', memorize: 'Unique random value per password before hash.' },
      { term: 'Key stretching', memorize: 'Slow hash (bcrypt, PBKDF2) defeats brute force.' },
      { term: 'Rainbow table', memorize: 'Precomputed hashes; defeated by salting.' },
      { term: 'Password hashing', memorize: 'Store salted one-way hashes, never plaintext.' },
      { term: 'Pepper', memorize: 'Secret added to passwords before hashing.' },
    ],
  },
  {
    path: 'Data Protection > General data considerations',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Classification, handling, retention, and sovereignty.',
    terms: [
      { term: 'Data classification', memorize: 'Labels sensitivity: public, private, confidential.' },
      { term: 'Data owner', memorize: 'Accountable for classification and access.' },
      { term: 'Data custodian', memorize: 'Implements controls per owner direction.' },
      { term: 'Data retention', memorize: 'How long data kept per policy/law.' },
      { term: 'Data sovereignty', memorize: 'Data must reside in specific jurisdiction.' },
      { term: 'Data in use', memorize: 'Active processing in memory/application.' },
      { term: 'Data at rest', memorize: 'Stored on disk, DB, backup.' },
      { term: 'Data in transit', memorize: 'Moving across network links.' },
    ],
  },
  {
    path: 'Data Protection > Data types',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'PII, PHI, proprietary, and credential data.',
    terms: [
      { term: 'PII', memorize: 'Personally identifiable information.' },
      { term: 'PHI', memorize: 'Protected health information (HIPAA).' },
      { term: 'PCI', memorize: 'Payment card data governed by PCI DSS.' },
      { term: 'Proprietary data', memorize: 'Trade secrets and internal intellectual property.' },
      { term: 'Credentials', memorize: 'Passwords, keys, tokens — highest protection.' },
    ],
  },
  {
    path: 'Data Protection > Methods to secure data',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Encryption, masking, DLP, and secure disposal.',
    terms: [
      { term: 'DLP', memorize: 'Blocks or alerts on sensitive data exfiltration.' },
      { term: 'Tokenization', memorize: 'Substitute token for PAN or sensitive value.' },
      { term: 'Anonymization', memorize: 'Remove identifying attributes irreversibly.' },
      { term: 'Pseudonymization', memorize: 'Replace identifiers; reversible with key.' },
      { term: 'Secure wipe', memorize: 'Overwrite or destroy media so data unrecoverable.' },
      { term: 'Degaussing', memorize: 'Magnetic erasure of storage media.' },
    ],
  },
  {
    path: 'Computing Resources > Wireless security settings',
    domain: '3.0 Security Architecture',
    summary: 'WPA3, enterprise auth, and rogue AP defense.',
    terms: [
      { term: 'WPA3', memorize: 'Latest Wi-Fi security; SAE replaces PSK weaknesses.' },
      { term: '802.1X', memorize: 'Port-based NAC for Wi-Fi and wired.' },
      { term: 'WIDS/WIPS', memorize: 'Wireless intrusion detection/prevention.' },
      { term: 'SSID cloaking', memorize: 'Weak obscurity — not real security.' },
      { term: 'Evil twin', memorize: 'Rogue AP with legitimate-looking SSID.' },
      { term: 'Bluetooth attacks', memorize: 'Bluesnarfing, bluejacking, pairing attacks.' },
    ],
  },
  {
    path: 'Computing Resources > Secure baselines',
    domain: '4.0 Security Operations',
    summary: 'Standard hardened configs for OS, apps, and devices.',
    terms: [
      { term: 'Secure baseline', memorize: 'Documented minimum secure configuration.' },
      { term: 'CIS Benchmarks', memorize: 'Industry hardening guides.' },
      { term: 'Group Policy', memorize: 'Central Windows configuration enforcement.' },
      { term: 'Configuration management', memorize: 'Track and control config changes.' },
      { term: 'Golden image', memorize: 'Pre-hardened template for deployment.' },
    ],
  },
  {
    path: 'Computing Resources > Hardening targets',
    domain: '4.0 Security Operations',
    summary: 'Reduce attack surface on hosts and services.',
    terms: [
      { term: 'System hardening', memorize: 'Disable unused services, close ports, patch.' },
      { term: 'Application hardening', memorize: 'Secure defaults, input validation, WAF.' },
      { term: 'Port filtering', memorize: 'Allow only required ports/protocols.' },
      { term: 'Patch management', memorize: 'Timely deployment of security updates.' },
      { term: 'Least functionality', memorize: 'Install only required software/features.' },
    ],
  },
  {
    path: 'Computing Resources > Mobile solutions',
    domain: '4.0 Security Operations',
    summary: 'MDM, MAM, BYOD, and mobile threat defense.',
    terms: [
      { term: 'MDM', memorize: 'Mobile Device Management — policy on devices.' },
      { term: 'MAM', memorize: 'Mobile Application Management — app-level control.' },
      { term: 'BYOD', memorize: 'Bring your own device — personal hardware at work.' },
      { term: 'COPE', memorize: 'Corporate-owned, personally enabled devices.' },
      { term: 'Geofencing', memorize: 'Restrict features by location.' },
      { term: 'Remote wipe', memorize: 'Erase device data if lost or stolen.' },
    ],
  },
  {
    path: 'Computing Resources > Sandboxing',
    domain: '4.0 Security Operations',
    summary: 'Isolated environment to run untrusted code safely.',
    terms: [
      { term: 'Sandboxing', memorize: 'Isolated execution limits malware spread.' },
      { term: 'Containerization', memorize: 'OS-level isolation for apps (Docker).' },
      { term: 'Virtualization', memorize: 'VM isolation from host and other VMs.' },
      { term: 'Application container', memorize: 'Runs untrusted code in restricted environment.' },
    ],
  },
  {
    path: 'Computing Resources > Application security',
    domain: '4.0 Security Operations',
    summary: 'Secure SDLC, testing, and runtime protection.',
    terms: [
      { term: 'WAF', memorize: 'Web Application Firewall filters HTTP attacks.' },
      { term: 'SAST', memorize: 'Static analysis — review source before runtime.' },
      { term: 'DAST', memorize: 'Dynamic analysis — test running application.' },
      { term: 'Fuzzing', memorize: 'Random/malformed input to find crashes.' },
      { term: 'Input validation', memorize: 'Reject malicious data at application boundary.' },
      { term: 'OWASP Top 10', memorize: 'Common web application risk categories.' },
    ],
  },
  {
    path: 'Access Management > Multifactor authentication',
    domain: '4.0 Security Operations',
    summary: 'Something you know, have, are, or do.',
    terms: [
      { term: 'MFA', memorize: 'Two or more factor types required.' },
      { term: 'Biometrics', memorize: 'Fingerprint, retina, facial recognition.' },
      { term: 'TOTP', memorize: 'Time-based one-time password (authenticator app).' },
      { term: 'FIDO2', memorize: 'Phishing-resistant hardware security keys.' },
      { term: 'Fast IDentity Online', memorize: 'FIDO standard for passwordless auth.' },
      { term: 'SMS OTP', memorize: 'Weaker factor — SIM swap risk.' },
    ],
  },
  {
    path: 'Access Management > Password concepts',
    domain: '4.0 Security Operations',
    summary: 'Policy, storage, and common attacks.',
    terms: [
      { term: 'Password complexity', memorize: 'Length and character variety requirements.' },
      { term: 'Password age', memorize: 'Maximum lifetime before rotation.' },
      { term: 'Password history', memorize: 'Prevent reuse of recent passwords.' },
      { term: 'Password reuse', memorize: 'Same password on multiple sites — high risk.' },
      { term: 'Password spraying', memorize: 'Few common passwords against many accounts.' },
      { term: 'Credential stuffing', memorize: 'Reused breached credentials tried elsewhere.' },
      { term: 'Password manager', memorize: 'Stores unique strong passwords securely.' },
    ],
  },
  {
    path: 'Access Management > Provisioning/de-provisioning user accounts',
    domain: '4.0 Security Operations',
    summary: 'Joiner/mover/leaver lifecycle and access hygiene.',
    terms: [
      { term: 'Provisioning', memorize: 'Create accounts and assign initial access.' },
      { term: 'De-provisioning', memorize: 'Disable/delete access when user leaves.' },
      { term: 'Onboarding', memorize: 'Grant role-appropriate access on hire.' },
      { term: 'Offboarding', memorize: 'Revoke access, collect assets on exit.' },
      { term: 'Orphaned account', memorize: 'Active account with no valid owner.' },
      { term: 'Privilege creep', memorize: 'Accumulated access beyond current role.' },
    ],
  },
  {
    path: 'Access Management > Permission assignments and implications',
    domain: '4.0 Security Operations',
    summary: 'RBAC, ACLs, and excessive permissions risk.',
    terms: [
      { term: 'RBAC', memorize: 'Role-based access — permissions tied to job role.' },
      { term: 'ACL', memorize: 'Access Control List on object/resource.' },
      { term: 'Least privilege', memorize: 'Minimum permissions to perform job.' },
      { term: 'Separation of duties', memorize: 'Split critical tasks across people.' },
      { term: 'Need to know', memorize: 'Access only to required information.' },
      { term: 'Privilege escalation', memorize: 'Gain higher access than authorized.' },
    ],
  },
  {
    path: 'Access Management > Access controls',
    domain: '4.0 Security Operations',
    summary: 'DAC, MAC, RBAC, ABAC models.',
    terms: [
      { term: 'DAC', memorize: 'Discretionary — owner decides access.' },
      { term: 'MAC', memorize: 'Mandatory — system enforces classification labels.' },
      { term: 'RBAC', memorize: 'Role-based access control.' },
      { term: 'ABAC', memorize: 'Attribute-based — policies on attributes.' },
      { term: 'Rule-based access control', memorize: 'Rules like time-of-day restrictions.' },
      { term: 'Access control vestibule', memorize: 'Mantrap prevents tailgating.' },
    ],
  },
  {
    path: 'Access Management > Federation',
    domain: '4.0 Security Operations',
    summary: 'Trust between identity providers across domains.',
    terms: [
      { term: 'Federation', memorize: 'Trust IdPs across organizations.' },
      { term: 'SAML', memorize: 'XML federation standard for SSO.' },
      { term: 'OAuth', memorize: 'Delegated authorization framework.' },
      { term: 'OpenID Connect', memorize: 'Identity layer on OAuth for authentication.' },
      { term: 'Identity provider', memorize: 'Authenticates users (IdP).' },
      { term: 'Service provider', memorize: 'Application relying on IdP (SP).' },
    ],
  },
  {
    path: 'Access Management > Single sign-on (SSO)',
    domain: '4.0 Security Operations',
    summary: 'One login for multiple applications.',
    terms: [
      { term: 'SSO', memorize: 'Single authentication event for multiple apps.' },
      { term: 'SAML', memorize: 'Common enterprise SSO protocol.' },
      { term: 'Kerberos', memorize: 'Ticket-granting SSO in Windows domains.' },
      { term: 'Session token', memorize: 'Proof of auth for subsequent requests.' },
      { term: 'IdP-initiated SSO', memorize: 'Login starts at identity provider.' },
    ],
  },
  {
    path: 'Secure Operations > Use cases of automation and scripting',
    domain: '4.0 Security Operations',
    summary: 'SOAR, orchestration, and repeatable response.',
    terms: [
      { term: 'SOAR', memorize: 'Security Orchestration, Automation, Response.' },
      { term: 'Playbook', memorize: 'Automated incident response workflow.' },
      { term: 'Runbook', memorize: 'Documented manual/automated procedure.' },
      { term: 'Scripting', memorize: 'Python/PowerShell for repetitive security tasks.' },
      { term: 'API integration', memorize: 'Connect tools for automated enrichment.' },
    ],
  },
  {
    path: 'Secure Operations > Benefits',
    domain: '4.0 Security Operations',
    summary: 'Speed, consistency, and reduced human error.',
    terms: [
      { term: 'Consistency', memorize: 'Same steps every time — fewer mistakes.' },
      { term: 'Efficiency', memorize: 'Faster triage and remediation.' },
      { term: 'Scalability', memorize: 'Handle more alerts without linear staffing.' },
      { term: 'Alert tuning', memorize: 'Reduce false positives in automated pipelines.' },
    ],
  },
  {
    path: 'Secure Operations > Other considerations',
    domain: '4.0 Security Operations',
    summary: 'Risks of automation: false positives, runaway actions.',
    terms: [
      { term: 'False positive', memorize: 'Benign event flagged as malicious.' },
      { term: 'False negative', memorize: 'Attack missed by control.' },
      { term: 'Human in the loop', memorize: 'Approval before destructive automation.' },
      { term: 'Change control', memorize: 'Test automation changes before production.' },
    ],
  },
  {
    path: 'Architecture Models > Architecture and infrastructure concepts',
    domain: '3.0 Security Architecture',
    summary: 'Cloud models, segmentation, and deployment patterns.',
    terms: [
      { term: 'IaaS', memorize: 'Infrastructure as a Service — you manage OS up.' },
      { term: 'PaaS', memorize: 'Platform as a Service — you manage apps.' },
      { term: 'SaaS', memorize: 'Software as a Service — provider manages stack.' },
      { term: 'Private cloud', memorize: 'Dedicated environment for one org.' },
      { term: 'Public cloud', memorize: 'Shared provider infrastructure.' },
      { term: 'Hybrid cloud', memorize: 'Mix of on-prem and cloud.' },
      { term: 'Air gap', memorize: 'Physical isolation from other networks.' },
      { term: 'DMZ', memorize: 'Perimeter zone for public-facing services.' },
    ],
  },
  {
    path: 'Architecture Models > Considerations',
    domain: '3.0 Security Architecture',
    summary: 'Shared responsibility, tenancy, and blast radius.',
    terms: [
      { term: 'Shared responsibility model', memorize: 'Provider vs customer security duties.' },
      { term: 'Multi-tenant architecture', memorize: 'Multiple customers on shared infrastructure.' },
      { term: 'Serverless architecture', memorize: 'Functions as a Service — event-driven.' },
      { term: 'Blast radius', memorize: 'Scope of damage if component compromised.' },
      { term: 'Peer-to-peer model', memorize: 'Direct node communication — harder to control.' },
    ],
  },
  {
    path: 'Security Enterprise Infrastructure > Infrastructure considerations',
    domain: '3.0 Security Architecture',
    summary: 'Placement, redundancy, and secure design of core services.',
    terms: [
      { term: 'Defense in depth', memorize: 'Multiple security layers.' },
      { term: 'Network segmentation', memorize: 'Isolate zones to limit lateral movement.' },
      { term: 'Jump server', memorize: 'Bastion for administrative access.' },
      { term: 'Inline deployment', memorize: 'Device in traffic path can block/modify.' },
      { term: 'Tap/SPAN', memorize: 'Passive copy of traffic for monitoring.' },
      { term: 'Load balancer', memorize: 'Distributes traffic; can offload TLS.' },
    ],
  },
  {
    path: 'Security Enterprise Infrastructure > Infrastructure considerations > Secure communication/access',
    domain: '3.0 Security Architecture',
    summary: 'VPN, TLS, NAC, and secure remote access.',
    terms: [
      { term: 'VPN', memorize: 'Encrypted tunnel over untrusted network.' },
      { term: 'IPsec', memorize: 'Network-layer VPN encryption/authentication.' },
      { term: 'TLS', memorize: 'Transport Layer Security for apps (HTTPS).' },
      { term: 'NAC', memorize: 'Network Access Control — health check before access.' },
      { term: '802.1X', memorize: 'Port-based network access control.' },
      { term: 'Split tunneling', memorize: 'Some traffic bypasses VPN — risk on untrusted nets.' },
    ],
  },
  {
    path: 'Mitigation Techniques > Least privilege',
    domain: '3.0 Security Architecture',
    summary: 'Minimum rights needed; default deny.',
    terms: [
      { term: 'Least privilege', memorize: 'Only permissions required for the task.' },
      { term: 'Default deny', memorize: 'Block unless explicitly allowed.' },
      { term: 'Allow list', memorize: 'Permit only approved items.' },
      { term: 'Block list', memorize: 'Deny known bad; misses unknown threats.' },
      { term: 'Just-in-time access', memorize: 'Temporary elevated privileges.' },
    ],
  },
  {
    path: 'Mitigation Techniques > Access control',
    domain: '3.0 Security Architecture',
    summary: 'Physical and logical controls on entry.',
    terms: [
      { term: 'MAC', memorize: 'Mandatory access control by classification.' },
      { term: 'DAC', memorize: 'Owner-controlled permissions.' },
      { term: 'RBAC', memorize: 'Permissions via roles.' },
      { term: 'ABAC', memorize: 'Policy based on user/resource attributes.' },
      { term: 'Access control vestibule', memorize: 'Two-door mantrap.' },
    ],
  },
  {
    path: 'Mitigation Techniques > Configuration enforcement',
    domain: '3.0 Security Architecture',
    summary: 'GPO, MDM, and automated compliance checks.',
    terms: [
      { term: 'Configuration enforcement', memorize: 'Automated compliance with baseline.' },
      { term: 'Group Policy', memorize: 'Windows centralized settings.' },
      { term: 'MDM', memorize: 'Enforce mobile device configuration.' },
      { term: 'SCAP', memorize: 'Security Content Automation Protocol for compliance.' },
    ],
  },
  {
    path: 'Mitigation Techniques > Hardening techniques',
    domain: '3.0 Security Architecture',
    summary: 'Disable defaults, patch, and minimize exposure.',
    terms: [
      { term: 'System hardening', memorize: 'Remove unused services and accounts.' },
      { term: 'Application hardening', memorize: 'Secure coding and config.' },
      { term: 'Patch management', memorize: 'Apply vendor security updates.' },
      { term: 'Port security', memorize: 'Restrict switch ports by MAC.' },
      { term: 'Encryption', memorize: 'Protect data at rest and in transit.' },
    ],
  },
  {
    path: 'Security Architecture > Backups',
    domain: '3.0 Security Architecture',
    summary: '3-2-1 rule, offline/immutable, and restore testing.',
    terms: [
      { term: 'Full backup', memorize: 'Complete copy of data.' },
      { term: 'Incremental backup', memorize: 'Changes since last backup of any type.' },
      { term: 'Differential backup', memorize: 'Changes since last full backup.' },
      { term: 'Snapshot', memorize: 'Point-in-time copy, often quick restore.' },
      { term: 'Immutable backup', memorize: 'Cannot be altered — ransomware defense.' },
      { term: 'Offline backup', memorize: 'Air-gapped copy off network.' },
    ],
  },
  {
    path: 'Security Architecture > Power',
    domain: '3.0 Security Architecture',
    summary: 'UPS, generator, and graceful shutdown for availability.',
    terms: [
      { term: 'UPS', memorize: 'Uninterruptible Power Supply — battery bridge.' },
      { term: 'Generator', memorize: 'Long-term power during outage.' },
      { term: 'Dual power feeds', memorize: 'Redundant electrical supply.' },
      { term: 'Graceful shutdown', memorize: 'Orderly power-off to prevent corruption.' },
    ],
  },
  {
    path: 'Security Architecture > High availability',
    domain: '3.0 Security Architecture',
    summary: 'Redundancy, clustering, and fault tolerance.',
    terms: [
      { term: 'High availability', memorize: 'Minimize downtime via redundancy.' },
      { term: 'Active/Active clustering', memorize: 'All nodes handle load concurrently.' },
      { term: 'Active/Passive clustering', memorize: 'Standby node takes over on failure.' },
      { term: 'Failover', memorize: 'Automatic switch to backup component.' },
      { term: 'RAID', memorize: 'Disk redundancy for availability/integrity.' },
      { term: 'Load balancing', memorize: 'Distribute traffic across healthy nodes.' },
    ],
  },
  {
    path: 'Security Architecture > Continuity of operations',
    domain: '3.0 Security Architecture',
    summary: 'COOP keeps critical functions running during disruption.',
    terms: [
      { term: 'COOP', memorize: 'Continuity of Operations Plan.' },
      { term: 'BCP', memorize: 'Business Continuity Plan.' },
      { term: 'DRP', memorize: 'Disaster Recovery Plan — IT restoration.' },
      { term: 'Cold site', memorize: 'Facility only; no configured equipment.' },
      { term: 'Warm site', memorize: 'Partial equipment; faster recovery.' },
      { term: 'Hot site', memorize: 'Fully configured mirror; fastest recovery.' },
    ],
  },
  {
    path: 'Asset Management > Assignment/accounting',
    domain: '3.0 Security Architecture',
    summary: 'Track who owns and is responsible for each asset.',
    terms: [
      { term: 'Asset inventory', memorize: 'Catalog of hardware, software, data.' },
      { term: 'Asset tag', memorize: 'Physical identifier on device.' },
      { term: 'CMDB', memorize: 'Configuration Management Database.' },
      { term: 'Data owner', memorize: 'Accountable for data classification.' },
      { term: 'System owner', memorize: 'Accountable for system security.' },
    ],
  },
  {
    path: 'Asset Management > Monitoring/asset tracking',
    domain: '3.0 Security Architecture',
    summary: 'Know where assets are and detect unauthorized devices.',
    terms: [
      { term: 'Asset tracking', memorize: 'Monitor location and status of devices.' },
      { term: 'Agent-based monitoring', memorize: 'Software agent on each endpoint.' },
      { term: 'Agentless monitoring', memorize: 'Remote polling without endpoint agent.' },
      { term: 'NAC', memorize: 'Detect unknown devices on network.' },
      { term: 'SNMP', memorize: 'Monitor network device health (UDP 161).' },
    ],
  },
  {
    path: 'Asset Management > Disposal/decommissioning',
    domain: '3.0 Security Architecture',
    summary: 'Secure wipe, destruction, and certificate of destruction.',
    terms: [
      { term: 'Secure wipe', memorize: 'Overwrite data before reuse or sale.' },
      { term: 'Degaussing', memorize: 'Destroy magnetic data on drives.' },
      { term: 'Shredding', memorize: 'Physical destruction of media.' },
      { term: 'Certificate of destruction', memorize: 'Proof secure disposal occurred.' },
      { term: 'Data retention policy', memorize: 'When data may be destroyed.' },
    ],
  },
  {
    path: 'Physical security',
    domain: '3.0 Security Architecture',
    summary: 'Gates, guards, CCTV, and environmental controls.',
    terms: [
      { term: 'CCTV', memorize: 'Closed-circuit video surveillance.' },
      { term: 'Mantrap', memorize: 'Access control vestibule — one person at a time.' },
      { term: 'Bollards', memorize: 'Barriers against vehicle attacks.' },
      { term: 'Fencing', memorize: 'Perimeter physical barrier.' },
      { term: 'Biometric door lock', memorize: 'Fingerprint/retina physical access.' },
      { term: 'HVAC', memorize: 'Environmental control; protect server rooms.' },
    ],
  },
  {
    path: 'Incident Response Activities > Process',
    domain: '4.0 Security Operations',
    summary: 'Preparation → Identification → Containment → Eradication → Recovery → Lessons learned.',
    terms: [
      { term: 'Incident response plan', memorize: 'Documented IR phases and roles.' },
      { term: 'Incident containment', memorize: 'Limit spread and impact.' },
      { term: 'Incident eradication', memorize: 'Remove threat from environment.' },
      { term: 'Incident recovery', memorize: 'Restore normal operations safely.' },
      { term: 'Lessons learned', memorize: 'Post-incident review and improvements.' },
      { term: 'Chain of custody', memorize: 'Document evidence handling for legal use.' },
    ],
  },
  {
    path: 'Incident Response Activities > Threat hunting',
    domain: '4.0 Security Operations',
    summary: 'Proactive search for hidden threats using hypotheses and telemetry.',
    terms: [
      { term: 'Threat hunting', memorize: 'Proactive search for undetected threats.' },
      { term: 'Hypothesis-driven hunting', memorize: 'Test theory of attacker behavior.' },
      { term: 'IOC', memorize: 'Indicator of compromise.' },
      { term: 'TTP', memorize: 'Tactics, techniques, and procedures.' },
      { term: 'Threat intelligence', memorize: 'Context feeds for hunting and detection.' },
    ],
  },
  {
    path: 'Support an Investigation > Log data',
    domain: '4.0 Security Operations',
    summary: 'Centralized logs, correlation, and forensic timestamps.',
    terms: [
      { term: 'SIEM', memorize: 'Aggregates and correlates security logs.' },
      { term: 'Syslog', memorize: 'Standard log forwarding protocol.' },
      { term: 'NetFlow', memorize: 'Network traffic metadata for analysis.' },
      { term: 'Log retention', memorize: 'How long logs kept for investigation.' },
      { term: 'Time synchronization', memorize: 'NTP ensures accurate event correlation.' },
      { term: 'Chain of custody', memorize: 'Evidence integrity documentation.' },
    ],
  },
  {
    path: 'Security Governance > Policies',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'High-level mandatory rules from leadership.',
    terms: [
      { term: 'Security policy', memorize: 'Top-level mandatory organizational rules.' },
      { term: 'AUP', memorize: 'Acceptable Use Policy for systems.' },
      { term: 'Data classification policy', memorize: 'How to label and handle data.' },
      { term: 'Password policy', memorize: 'Requirements for credential strength.' },
      { term: 'Remote access policy', memorize: 'Rules for VPN and off-site access.' },
    ],
  },
  {
    path: 'Security Governance > Standards',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Specific technical requirements supporting policies.',
    terms: [
      { term: 'Security standard', memorize: 'Mandatory technical requirements.' },
      { term: 'CIS Benchmarks', memorize: 'Hardening standards for systems.' },
      { term: 'NIST', memorize: 'US standards body (800 series).' },
      { term: 'ISO 27001', memorize: 'International ISMS standard.' },
      { term: 'PCI DSS', memorize: 'Payment card security standard.' },
    ],
  },
  {
    path: 'Security Governance > Guidelines > Procedures',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Recommended practices and step-by-step how-to.',
    terms: [
      { term: 'Guideline', memorize: 'Recommended best practice — flexible.' },
      { term: 'Procedure', memorize: 'Step-by-step instructions to implement controls.' },
      { term: 'Runbook', memorize: 'Operational steps for specific scenarios.' },
      { term: 'Playbook', memorize: 'Automated or manual IR workflow.' },
    ],
  },
  {
    path: 'Security Governance > Types of governance structures',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Centralized vs decentralized security org models.',
    terms: [
      { term: 'Centralized security governance', memorize: 'Single team sets policy org-wide.' },
      { term: 'Decentralized security governance', memorize: 'Business units own security locally.' },
      { term: 'Governance committee', memorize: 'Cross-functional oversight body.' },
      { term: 'CISO', memorize: 'Chief Information Security Officer.' },
    ],
  },
  {
    path: 'Security Governance > Roles and responsibilities for systems and data',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Owner, custodian, user, and controller/processor.',
    terms: [
      { term: 'Data owner', memorize: 'Sets classification and access rules.' },
      { term: 'Data custodian', memorize: 'Implements owner requirements technically.' },
      { term: 'Data controller', memorize: 'Decides why/how personal data processed.' },
      { term: 'Data processor', memorize: 'Processes data on behalf of controller.' },
      { term: 'System administrator', memorize: 'Maintains systems per policy.' },
    ],
  },
  {
    path: 'Vulnerability Management Application',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Flaws in software applications and dependencies.',
    terms: [
      { term: 'Application-level vulnerability', memorize: 'Bug or misconfig in application code.' },
      { term: 'SQL injection', memorize: 'Database manipulation via app input.' },
      { term: 'XSS', memorize: 'Script injection in web clients.' },
      { term: 'Patch management', memorize: 'Apply vendor fixes promptly.' },
      { term: 'SAST/DAST', memorize: 'Find flaws before and during runtime.' },
    ],
  },
  {
    path: 'Vulnerability Management Web-based',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Web server, API, and browser-side weaknesses.',
    terms: [
      { term: 'WAF', memorize: 'Filters malicious HTTP traffic.' },
      { term: 'CSRF', memorize: 'Forges authenticated user actions.' },
      { term: 'Clickjacking', memorize: 'Tricks user into clicking hidden element.' },
      { term: 'Directory traversal', memorize: 'Access files outside web root.' },
      { term: 'OWASP Top 10', memorize: 'Critical web application risks.' },
    ],
  },
  {
    path: 'Vulnerability Management Hardware',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Firmware, BIOS, and embedded device flaws.',
    terms: [
      { term: 'Firmware vulnerability', memorize: 'Flaw in device embedded software.' },
      { term: 'Default credentials', memorize: 'Factory passwords must be changed.' },
      { term: 'Hardware root of trust', memorize: 'Secure boot chain from TPM/UEFI.' },
      { term: 'EOL hardware', memorize: 'Unsupported devices lack patches.' },
    ],
  },
  {
    path: 'Vulnerability Management Misconfiguration',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Insecure defaults, open shares, and weak rules.',
    terms: [
      { term: 'Misconfiguration', memorize: 'Secure feature disabled or wrong setting.' },
      { term: 'Open S3 bucket', memorize: 'Public cloud storage exposure example.' },
      { term: 'Default deny', memorize: 'Firewall should block unless allowed.' },
      { term: 'Secure baseline', memorize: 'Compare configs to hardened standard.' },
      { term: 'Configuration drift', memorize: 'System deviates from approved baseline.' },
    ],
  },
  {
    path: 'Vulnerability Management Mobile device',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Lost devices, sideloading, and mobile malware.',
    terms: [
      { term: 'Mobile device vulnerability', memorize: 'Unpatched OS or malicious apps.' },
      { term: 'Sideloading', memorize: 'Install apps outside official store — risky.' },
      { term: 'Jailbreaking/rooting', memorize: 'Bypasses mobile security controls.' },
      { term: 'MDM', memorize: 'Enforce mobile security policies.' },
      { term: 'Remote wipe', memorize: 'Erase data on lost device.' },
    ],
  },
  {
    path: 'Vulnerability Management Zero-day',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Unknown exploits before vendor patch exists.',
    terms: [
      { term: 'Zero-day vulnerability', memorize: 'No patch available yet.' },
      { term: 'Zero-day exploit', memorize: 'Attack using unpublished vulnerability.' },
      { term: 'Virtual patching', memorize: 'IPS/WAF blocks exploit signature.' },
      { term: 'Threat intelligence', memorize: 'Early warning of in-the-wild exploits.' },
      { term: 'Defense in depth', memorize: 'Layers compensate when patch absent.' },
    ],
  },
  {
    path: 'Vulnerability Management Supply chain',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Third-party code, updates, and hardware trust.',
    terms: [
      { term: 'Supply chain attack', memorize: 'Trojanized update or dependency.' },
      { term: 'SBOM', memorize: 'Inventory of software components.' },
      { term: 'Vendor assessment', memorize: 'Security review before procurement.' },
      { term: 'Code signing', memorize: 'Verify software publisher integrity.' },
    ],
  },
  {
    path: 'Vulnerability Management Cryptographic',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Weak algorithms, poor implementation, key exposure.',
    terms: [
      { term: 'Weak encryption', memorize: 'Deprecated algorithms (DES, MD5, RC4).' },
      { term: 'Cryptographic failure', memorize: 'Misuse or weak crypto in app.' },
      { term: 'Downgrade attack', memorize: 'Force weaker protocol version.' },
      { term: 'Birthday attack', memorize: 'Exploits hash collision probability.' },
      { term: 'Cryptanalysis', memorize: 'Breaking or weakening crypto systems.' },
    ],
  },
  {
    path: 'Vulnerability Management > Identification methods',
    domain: '4.0 Security Operations',
    summary: 'Scanning, pentest, bug bounty, and threat feeds.',
    terms: [
      { term: 'Vulnerability scan', memorize: 'Automated tool finds known weaknesses.' },
      { term: 'Penetration test', memorize: 'Simulated attack to find exploitable flaws.' },
      { term: 'Bug bounty', memorize: 'Rewards external researchers for findings.' },
      { term: 'Threat feed', memorize: 'External IOC and vulnerability intelligence.' },
      { term: 'OSINT', memorize: 'Open-source intelligence gathering.' },
    ],
  },
  {
    path: 'Vulnerability Management > Analysis',
    domain: '4.0 Security Operations',
    summary: 'Prioritize by CVSS, context, and asset criticality.',
    terms: [
      { term: 'CVSS', memorize: 'Common Vulnerability Scoring System.' },
      { term: 'Risk rating', memorize: 'Likelihood × impact for prioritization.' },
      { term: 'False positive', memorize: 'Scanner reports non-exploitable finding.' },
      { term: 'Vulnerability validation', memorize: 'Confirm finding is real and relevant.' },
    ],
  },
  {
    path: 'Vulnerability Management > Vulnerability response and remediation',
    domain: '4.0 Security Operations',
    summary: 'Patch, mitigate, accept, or transfer risk.',
    terms: [
      { term: 'Patch management', memorize: 'Deploy vendor security fixes.' },
      { term: 'Compensating control', memorize: 'Mitigate when patch not possible.' },
      { term: 'Risk acceptance', memorize: 'Formally accept residual risk.' },
      { term: 'Change management', memorize: 'Controlled rollout of remediations.' },
      { term: 'Rollback plan', memorize: 'Revert if patch causes outage.' },
    ],
  },
  {
    path: 'Security Alerts and Monitoring > Tools',
    domain: '4.0 Security Operations',
    summary: 'SIEM, SOAR, EDR, and network monitoring.',
    terms: [
      { term: 'SIEM', memorize: 'Log aggregation and correlation.' },
      { term: 'SOAR', memorize: 'Automated response orchestration.' },
      { term: 'EDR', memorize: 'Endpoint Detection and Response.' },
      { term: 'XDR', memorize: 'Extended detection across email, cloud, endpoint.' },
      { term: 'IDS', memorize: 'Detects suspicious activity — alerts.' },
      { term: 'IPS', memorize: 'Detects and blocks inline.' },
      { term: 'Packet capture', memorize: 'Full traffic recording for analysis.' },
    ],
  },
  {
    path: 'Security Alerts and Monitoring > Monitoring computing resources',
    domain: '4.0 Security Operations',
    summary: 'CPU, memory, disk, and service health baselines.',
    terms: [
      { term: 'Baseline monitoring', memorize: 'Compare activity to normal patterns.' },
      { term: 'SNMP monitoring', memorize: 'Poll device metrics.' },
      { term: 'Agent-based monitoring', memorize: 'Endpoint agent reports telemetry.' },
      { term: 'NetFlow analysis', memorize: 'Detect unusual traffic volumes/patterns.' },
    ],
  },
  {
    path: 'Security Alerts and Monitoring > Activities',
    domain: '4.0 Security Operations',
    summary: 'Triage, escalation, tuning, and reporting.',
    terms: [
      { term: 'Alert triage', memorize: 'Prioritize and investigate alerts.' },
      { term: 'Alert fatigue', memorize: 'Too many low-priority alerts.' },
      { term: 'Alert tuning', memorize: 'Reduce false positives.' },
      { term: 'Escalation', memorize: 'Involve higher tier or management.' },
      { term: 'Ticket workflow', memorize: 'Track investigation to resolution.' },
    ],
  },
  {
    path: 'Enterprise Capabilities > IDS/IPS',
    domain: '4.0 Security Operations',
    summary: 'Signature vs anomaly detection; placement matters.',
    terms: [
      { term: 'IDS', memorize: 'Passive detection — copies/monitors traffic.' },
      { term: 'IPS', memorize: 'Inline prevention — can drop traffic.' },
      { term: 'HIDS', memorize: 'Host-based intrusion detection.' },
      { term: 'NIDS', memorize: 'Network-based intrusion detection.' },
      { term: 'Signature-based detection', memorize: 'Matches known attack patterns.' },
      { term: 'Anomaly-based detection', memorize: 'Deviations from baseline behavior.' },
    ],
  },
  {
    path: 'Enterprise Capabilities > Implementation of secure protocols',
    domain: '4.0 Security Operations',
    summary: 'Replace insecure legacy protocols.',
    terms: [
      { term: 'HTTPS', memorize: 'HTTP over TLS — encrypt web traffic.' },
      { term: 'SSH', memorize: 'Secure remote shell — replaces Telnet.' },
      { term: 'SFTP', memorize: 'Secure file transfer over SSH.' },
      { term: 'DNSSEC', memorize: 'DNS response integrity/authentication.' },
      { term: 'SMTPS', memorize: 'SMTP with TLS for email in transit.' },
      { term: 'LDAPS', memorize: 'LDAP over TLS.' },
    ],
  },
  {
    path: 'Enterprise Capabilities > File integrity monitoring',
    domain: '4.0 Security Operations',
    summary: 'Detect unauthorized file and config changes.',
    terms: [
      { term: 'FIM', memorize: 'File Integrity Monitoring — hash baseline comparison.' },
      { term: 'Baseline hash', memorize: 'Known-good fingerprint of critical files.' },
      { term: 'Change detection', memorize: 'Alert when monitored files modified.' },
    ],
  },
  {
    path: 'Enterprise Capabilities > User behavior analytics',
    domain: '4.0 Security Operations',
    summary: 'UEBA detects anomalous user/account activity.',
    terms: [
      { term: 'UEBA', memorize: 'User and Entity Behavior Analytics.' },
      { term: 'Anomalous behavior recognition', memorize: 'Spot unusual login or data access.' },
      { term: 'Impossible travel', memorize: 'Logins from distant locations too quickly.' },
      { term: 'Privilege misuse', memorize: 'Admin actions outside normal pattern.' },
    ],
  },
  {
    path: 'Enterprise Capabilities > Operating system security',
    domain: '4.0 Security Operations',
    summary: 'Patching, EDR, AppLocker, and kernel protections.',
    terms: [
      { term: 'OS patching', memorize: 'Apply vendor security updates.' },
      { term: 'EDR', memorize: 'Endpoint threat detection and response.' },
      { term: 'Application allow listing', memorize: 'Only approved executables run.' },
      { term: 'ASLR', memorize: 'Address Space Layout Randomization.' },
      { term: 'DEP/NX bit', memorize: 'Prevents code execution in data areas.' },
    ],
  },
  {
    path: 'Enterprise Capabilities > Web filter',
    domain: '4.0 Security Operations',
    summary: 'URL/category filtering and malicious site blocking.',
    terms: [
      { term: 'Web filter', memorize: 'Blocks malicious or policy-violating URLs.' },
      { term: 'URL categorization', memorize: 'Group sites for policy enforcement.' },
      { term: 'SSL inspection', memorize: 'Decrypt HTTPS for inspection — privacy tradeoff.' },
      { term: 'DNS filtering', memorize: 'Block resolution of malicious domains.' },
    ],
  },
  {
    path: 'Security Awareness > Anomalous behavior recognition',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Train users to spot suspicious activity.',
    terms: [
      { term: 'Anomalous behavior recognition', memorize: 'Users report unusual account/system activity.' },
      { term: 'Security awareness training', memorize: 'Regular education on threats and policy.' },
      { term: 'Phishing simulation', memorize: 'Test user response to fake phish.' },
      { term: 'Report suspicious activity', memorize: 'Clear channel to security team.' },
    ],
  },
  {
    path: 'Security Awareness > Phishing',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Recognize and report social engineering email/SMS.',
    terms: [
      { term: 'Phishing', memorize: 'Fraudulent messages harvesting credentials.' },
      { term: 'Spear phishing', memorize: 'Personalized targeting.' },
      { term: 'Whaling', memorize: 'Executives targeted.' },
      { term: 'Vishing', memorize: 'Voice-based phishing.' },
      { term: 'Smishing', memorize: 'SMS phishing.' },
    ],
  },
  {
    path: 'Security Awareness > User guidance and training',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Onboarding training, refresher, and role-based content.',
    terms: [
      { term: 'Security awareness training', memorize: 'Teach policy, threats, reporting.' },
      { term: 'Clean desk policy', memorize: 'No sensitive papers left unattended.' },
      { term: 'Tailgating awareness', memorize: 'Do not hold secure doors open.' },
      { term: 'Password hygiene', memorize: 'Unique passwords, MFA, no sharing.' },
    ],
  },
  {
    path: 'Security Awareness > Reporting and monitoring',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'How users escalate suspected incidents.',
    terms: [
      { term: 'Incident reporting', memorize: 'Users notify security of suspected issues.' },
      { term: 'Phishing report button', memorize: 'Easy way to submit suspicious email.' },
      { term: 'Security hotline', memorize: 'Dedicated contact for urgent concerns.' },
    ],
  },
  {
    path: 'Security Awareness > Execution',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Deliver training, measure completion, reinforce culture.',
    terms: [
      { term: 'Training completion metrics', memorize: 'Track who finished awareness program.' },
      { term: 'Phishing click rate', memorize: 'Measure simulation failure rate over time.' },
      { term: 'Security champions', memorize: 'Dept advocates promoting good practice.' },
    ],
  },
  {
    path: 'Malicious Activity > Malware attacks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Virus, worm, trojan, ransomware, rootkit.',
    terms: [
      { term: 'Virus', memorize: 'Malware requiring host file to spread.' },
      { term: 'Worm', memorize: 'Self-replicating across network.' },
      { term: 'Trojan', memorize: 'Disguised as legitimate software.' },
      { term: 'Ransomware', memorize: 'Encrypts data; demands payment.' },
      { term: 'Rootkit', memorize: 'Hides presence on compromised system.' },
      { term: 'Spyware', memorize: 'Secretly monitors user activity.' },
      { term: 'Boot sector virus', memorize: 'Infects disk boot sector.' },
    ],
  },
  {
    path: 'Malicious Activity > Network attacks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'DDoS, MITM, DNS poisoning, ARP spoofing.',
    terms: [
      { term: 'DDoS', memorize: 'Distributed Denial of Service — overwhelms target.' },
      { term: 'On-path attack', memorize: 'Intercepts traffic between parties.' },
      { term: 'DNS poisoning', memorize: 'Corrupts DNS answers to redirect users.' },
      { term: 'ARP poisoning', memorize: 'False MAC-to-IP mappings on LAN.' },
      { term: 'SYN flood', memorize: 'TCP handshake exhaustion attack.' },
      { term: 'Amplification attack', memorize: 'Small query triggers large response to victim.' },
    ],
  },
  {
    path: 'Malicious Activity > Physical attacks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Theft, tampering, and hardware keyloggers.',
    terms: [
      { term: 'Hardware keylogger', memorize: 'Physical device captures keystrokes.' },
      { term: 'Cable tapping', memorize: 'Intercept physical network cabling.' },
      { term: 'Dumpster diving', memorize: 'Recover sensitive discarded documents.' },
      { term: 'Shoulder surfing', memorize: 'Observe screens or keyboards.' },
    ],
  },
  {
    path: 'Malicious Activity > Password attacks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Brute force, spraying, stuffing, and cracking.',
    terms: [
      { term: 'Brute force attack', memorize: 'Try all password combinations.' },
      { term: 'Password spraying', memorize: 'Common passwords against many accounts.' },
      { term: 'Credential stuffing', memorize: 'Breached creds tried on other sites.' },
      { term: 'Dictionary attack', memorize: 'Wordlist-based password guessing.' },
      { term: 'Rainbow table', memorize: 'Precomputed hash lookup — defeated by salt.' },
    ],
  },
  {
    path: 'Malicious Activity > Application attacks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'Injection, overflow, and session attacks.',
    terms: [
      { term: 'Injection attack', memorize: 'Malicious input interpreted as commands.' },
      { term: 'SQL injection', memorize: 'Database command injection.' },
      { term: 'Command injection attack', memorize: 'OS commands via vulnerable input.' },
      { term: 'Cross-site scripting (XSS)', memorize: 'Script runs in victim browser.' },
      { term: 'CSRF', memorize: 'Unauthorized action using victim session.' },
      { term: 'Forgery attack', memorize: 'Falsified requests or tokens.' },
    ],
  },
  {
    path: 'Malicious Activity > Indicators',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    summary: 'IOCs: hashes, IPs, domains, and behavioral signs.',
    terms: [
      { term: 'IOC', memorize: 'Indicator of compromise — artifact of intrusion.' },
      { term: 'File hash', memorize: 'MD5/SHA fingerprint of malware sample.' },
      { term: 'C2 traffic', memorize: 'Command-and-control beaconing pattern.' },
      { term: 'Lateral movement', memorize: 'Attacker spreads inside network.' },
      { term: 'Data exfiltration', memorize: 'Unauthorized data leaving organization.' },
    ],
  },
  {
    path: 'Change Management Processes > Business processes impacting security operation',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Security review when business processes change.',
    terms: [
      { term: 'Change management', memorize: 'Controlled process for production changes.' },
      { term: 'Change advisory board', memorize: 'CAB reviews and approves changes.' },
      { term: 'Security impact analysis', memorize: 'Assess risk before implementing change.' },
      { term: 'Version control', memorize: 'Track document and code changes.' },
    ],
  },
  {
    path: 'Change Management Processes > Technical implications',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Test patches, rollback, and outage windows.',
    terms: [
      { term: 'Rollback plan', memorize: 'Restore prior state if change fails.' },
      { term: 'Maintenance window', memorize: 'Scheduled time for disruptive changes.' },
      { term: 'Staging environment', memorize: 'Test changes before production.' },
      { term: 'Configuration baseline', memorize: 'Document expected post-change state.' },
    ],
  },
  {
    path: 'Change Management Processes > Documentation',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'RFCs, change tickets, and audit trail.',
    terms: [
      { term: 'Change ticket', memorize: 'Formal record of requested change.' },
      { term: 'RFC', memorize: 'Request for Change documentation.' },
      { term: 'As-built documentation', memorize: 'Records actual deployed configuration.' },
      { term: 'Audit trail', memorize: 'Who changed what and when.' },
    ],
  },
  {
    path: 'Risk Management > Risk assessment',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Identify assets, threats, vulnerabilities, and controls.',
    terms: [
      { term: 'Risk assessment', memorize: 'Systematic evaluation of organizational risk.' },
      { term: 'Threat modeling', memorize: 'Identify threats to system design (STRIDE).' },
      { term: 'Vulnerability assessment', memorize: 'Find weaknesses without full exploit.' },
      { term: 'Asset valuation', memorize: 'Worth of data/system to organization.' },
    ],
  },
  {
    path: 'Risk Management > Risk analysis',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Qualitative vs quantitative analysis methods.',
    terms: [
      { term: 'Qualitative risk analysis', memorize: 'Subjective scales (low/med/high).' },
      { term: 'Quantitative risk analysis', memorize: 'Numeric ALE, SLE, ARO calculations.' },
      { term: 'ALE', memorize: 'Annual Loss Expectancy = SLE × ARO.' },
      { term: 'SLE', memorize: 'Single Loss Expectancy per incident.' },
      { term: 'ARO', memorize: 'Annualized Rate of Occurrence.' },
    ],
  },
  {
    path: 'Risk Management > Risk register',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Living document of identified risks and owners.',
    terms: [
      { term: 'Risk register', memorize: 'Catalog of risks, scores, owners, status.' },
      { term: 'Risk owner', memorize: 'Accountable for treating specific risk.' },
      { term: 'Residual risk', memorize: 'Risk remaining after controls applied.' },
      { term: 'Inherent risk', memorize: 'Risk before any controls.' },
    ],
  },
  {
    path: 'Risk Management > Risk management strategies',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Accept, avoid, transfer, mitigate.',
    terms: [
      { term: 'Risk mitigation', memorize: 'Apply controls to reduce risk.' },
      { term: 'Risk acceptance', memorize: 'Acknowledge and tolerate residual risk.' },
      { term: 'Risk avoidance', memorize: 'Stop activity causing risk.' },
      { term: 'Risk transference', memorize: 'Shift risk via insurance or contract.' },
      { term: 'Cyber insurance', memorize: 'Transfers financial impact of incidents.' },
    ],
  },
  {
    path: 'Risk Management > Business impact analysis',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'BIA identifies critical functions and recovery priorities.',
    terms: [
      { term: 'BIA', memorize: 'Business Impact Analysis.' },
      { term: 'RTO', memorize: 'Recovery Time Objective — max acceptable downtime.' },
      { term: 'RPO', memorize: 'Recovery Point Objective — max acceptable data loss.' },
      { term: 'MTD', memorize: 'Maximum Tolerable Downtime.' },
      { term: 'Criticality ranking', memorize: 'Prioritize systems by business need.' },
    ],
  },
  {
    path: 'Risk Management > Risk identification',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Find risks via audits, scans, intel, and workshops.',
    terms: [
      { term: 'Risk identification', memorize: 'Discover threats and vulnerabilities to assets.' },
      { term: 'Brainstorming', memorize: 'Workshop to surface organizational risks.' },
      { term: 'Historical data', memorize: 'Past incidents inform future risks.' },
      { term: 'Threat intelligence', memorize: 'External view of emerging threats.' },
    ],
  },
  {
    path: 'Risk Assessment and Management > Vendor assessment',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Due diligence on third-party security posture.',
    terms: [
      { term: 'Vendor assessment', memorize: 'Evaluate supplier security before contract.' },
      { term: 'Questionnaire', memorize: 'SIG/CAIQ-style security survey.' },
      { term: 'Right to audit', memorize: 'Contract clause allowing customer audits.' },
      { term: 'SOC 2 report', memorize: 'Third-party audit of vendor controls.' },
    ],
  },
  {
    path: 'Risk Assessment and Management > Agreement types',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'SLA, MOU, ISA, BPA, NDA — know purpose of each.',
    terms: [
      { term: 'SLA', memorize: 'Service Level Agreement — performance commitments.' },
      { term: 'MOU', memorize: 'Memorandum of Understanding — non-binding intent.' },
      { term: 'ISA', memorize: 'Interconnection Security Agreement between orgs.' },
      { term: 'BPA', memorize: 'Business Partnership Agreement.' },
      { term: 'NDA', memorize: 'Non-Disclosure Agreement — protects confidential info.' },
      { term: 'SOW', memorize: 'Statement of Work — project scope and deliverables.' },
    ],
  },
  {
    path: 'Audits and Assessments > Internal',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'First-party review of controls and compliance.',
    terms: [
      { term: 'Internal audit', memorize: 'Organization reviews its own controls.' },
      { term: 'Self-assessment', memorize: 'Team evaluates against framework.' },
      { term: 'Gap analysis', memorize: 'Compare current state to required state.' },
      { term: 'Compliance assessment', memorize: 'Check adherence to policies/standards.' },
    ],
  },
  {
    path: 'Audits and Assessments > External',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Third-party audits and regulatory examinations.',
    terms: [
      { term: 'External audit', memorize: 'Independent auditor evaluates controls.' },
      { term: 'SOC 2', memorize: 'Service organization controls attestation.' },
      { term: 'ISO 27001 certification', memorize: 'External ISMS certification audit.' },
      { term: 'Regulatory examination', memorize: 'Government oversight (e.g., HIPAA).' },
    ],
  },
  {
    path: 'Audits and Assessments > Penetration testing',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Authorized simulated attacks; rules of engagement.',
    terms: [
      { term: 'Penetration test', memorize: 'Authorized exploit attempt on systems.' },
      { term: 'Rules of engagement', memorize: 'Scope, limits, and timing for pentest.' },
      { term: 'Black box test', memorize: 'No prior knowledge of target.' },
      { term: 'White box test', memorize: 'Full knowledge including source/docs.' },
      { term: 'Gray box test', memorize: 'Partial knowledge of environment.' },
    ],
  },
  {
    path: 'Security Compliance > Compliance reporting',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Document and report control effectiveness to stakeholders.',
    terms: [
      { term: 'Compliance reporting', memorize: 'Formal status to management/regulators.' },
      { term: 'Audit log', memorize: 'Evidence of control operation.' },
      { term: 'KPI/KRI', memorize: 'Key performance/risk indicators for program.' },
    ],
  },
  {
    path: 'Security Compliance > Consequences of non-compliance',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Fines, legal action, reputational damage.',
    terms: [
      { term: 'Regulatory fines', memorize: 'Penalties for violating laws (GDPR, HIPAA).' },
      { term: 'Legal liability', memorize: 'Lawsuits from affected parties.' },
      { term: 'Reputational damage', memorize: 'Loss of customer trust after breach.' },
      { term: 'License revocation', memorize: 'Loss of operating permission in regulated industries.' },
    ],
  },
  {
    path: 'Security Compliance > Compliance monitoring',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'Continuous control validation and automated compliance.',
    terms: [
      { term: 'Continuous monitoring', memorize: 'Ongoing control effectiveness checks.' },
      { term: 'GRC platform', memorize: 'Governance, risk, compliance tooling.' },
      { term: 'Automated compliance scanning', memorize: 'Tools map configs to frameworks.' },
    ],
  },
  {
    path: 'Security Compliance > Privacy',
    domain: '5.0 Security Program Management and Oversight',
    summary: 'GDPR, CCPA, data subject rights.',
    terms: [
      { term: 'GDPR', memorize: 'EU data protection regulation.' },
      { term: 'Data subject rights', memorize: 'Access, erasure, portability requests.' },
      { term: 'Privacy impact assessment', memorize: 'Evaluate privacy risk of new processing.' },
      { term: 'Data minimization', memorize: 'Collect only necessary personal data.' },
      { term: 'Consent management', memorize: 'Track and honor user privacy choices.' },
    ],
  },
]

function enrichTerms(topic) {
  return topic.terms.map((entry) => ({
    ...entry,
    inFlashcards: flashcardTerms.has(entry.term.trim().toLowerCase()),
    explanation: buildTermExplanation(entry),
  }))
}

const concepts = {
  version: 1,
  exam: 'CompTIA Security+ SY0-701',
  description:
    'Exam topic map with terms and concepts to memorize. Terms marked inFlashcards link to public/flashcards.json.',
  topicCount: TOPICS.length,
  topics: TOPICS.map((topic, index) => ({
    id: `topic-${String(index + 1).padStart(3, '0')}`,
    path: topic.path,
    domain: topic.domain,
    summary: topic.summary,
    terms: enrichTerms(topic),
  })),
}

const totalTerms = concepts.topics.reduce((sum, topic) => sum + topic.terms.length, 0)
const linkedTerms = concepts.topics.reduce(
  (sum, topic) => sum + topic.terms.filter((entry) => entry.inFlashcards).length,
  0,
)

concepts.termCount = totalTerms
concepts.linkedFlashcardTerms = linkedTerms

fs.writeFileSync('public/concepts.json', `${JSON.stringify(concepts, null, 2)}\n`)

console.log(
  JSON.stringify(
    {
      topics: concepts.topicCount,
      terms: totalTerms,
      linkedToFlashcards: linkedTerms,
      output: 'public/concepts.json',
    },
    null,
    2,
  ),
)
