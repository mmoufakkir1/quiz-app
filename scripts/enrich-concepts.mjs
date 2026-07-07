import fs from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const conceptsData = JSON.parse(fs.readFileSync('public/concepts.json', 'utf8'))
const questionsData = JSON.parse(fs.readFileSync('public/questions.json', 'utf8'))

function ensureSentence(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''
  return /[.!?)]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sentences(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return []
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  return parts ? parts.map((part) => part.trim()).filter(Boolean) : [trimmed]
}

function dedupeSentences(text) {
  const seen = new Set()
  return sentences(text)
    .filter((sentence) => {
      const key = sentence.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(' ')
}

function removeQuizWording(text) {
  return (text || '')
    .replace(/\s*Focus on that behavior, not on the extra wording around it\./gi, '')
    .replace(/\s*The other options describe different ideas\./gi, '')
    .replace(/, which is what separates it from the other choices[.]?/gi, '')
    .trim()
}

function cleanExplanation(explanation, term) {
  let text = removeQuizWording(explanation.trim())
  text = text.replace(new RegExp(`^This is ${escapeRegex(term)}[.]?\\s*`, 'i'), '')
  text = text.replace(
    new RegExp(`In security terminology, that is ${escapeRegex(term)}[.]?\\s*`, 'i'),
    '',
  )
  text = text.replace(/^The prompt is describing\s+/i, '')
  text = text.replace(/^The important detail is\s+/i, '')
  return text.trim()
}

function stripTopicContextSentences(text) {
  return dedupeSentences(
    sentences(text)
      .filter((sentence) => !/^This (?:fits|matters in|supports|topic helps)\b/i.test(sentence))
      .join(' '),
  )
}

const GENERIC_BOILERPLATE_PATTERNS = [
  /This helps security teams observe activity and investigate suspicious events[.]?/i,
  /Understanding .+ helps you apply the right security control or response in exam scenarios[.]?/i,
  /Know both the abbreviation .+ and the security role of .+[.]?/i,
  /is an abbreviation you should recognize by its full meaning and security use case[.]?/i,
  /Understand how this supports confidentiality, integrity, authenticity, or non-repudiation[.]?/i,
  /This is part of finding, prioritizing, or fixing security weaknesses[.]?/i,
  /This type of control helps reduce risk by enforcing expected security behavior[.]?/i,
  /Recognizing this helps you select the right prevention, detection, or response measure[.]?/i,
  /This is part of managing who users are, what they can access, and how that access is audited[.]?/i,
  /This supports governance, compliance, or risk management responsibilities[.]?/i,
  /This is commonly tested in secure architecture and infrastructure scenarios[.]?/i,
  /This supports resilience and helps maintain operations during failures or incidents[.]?/i,
  /Know the service, protocol, and port pairing when this appears in exam questions[.]?/i,
  /is a standard security or technology term you should recognize on the exam[.]?/i,
]

function hasGenericBoilerplate(text) {
  return GENERIC_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text || ''))
}

function stripBoilerplate(explanation) {
  let text = explanation.trim()
  text = text.replace(/\s*Study concept:.*$/i, '')
  text = text.replace(/\s*For Security\+, recognize .*$/i, '')
  text = text.replace(/\s*In [^,]+, connect (?:this term|it) to (?:this topic focus|Prove|Identity|Core|Administrative|Never|Email|Compare|Know|Why|Flaws|Third-party|Manipulating|Trust|Symmetric|One-way|HSM|X\.509|Hiding|Random|Labels|WPA3|Documented|Reduce|Isolated|Secure|Two|Create|Permissions|Trust|One|Documented|Speed|Benign|Passive|Replace|Detects|Users|Virus|DDoS|Theft|Brute|Injection|IOCs|Controlled|Test|Formal|Systematic|Subjective|Catalog|Apply|Evaluate|First-party|Independent|Authorized|Formal|Penalties|Ongoing|EU|Labels).*$/i, '')
  text = text.replace(
    /\s*This acronym appears on the CompTIA Security\+ SY0-701 objectives and should be recognized by its full meaning[.]?/gi,
    '',
  )
  for (const pattern of GENERIC_BOILERPLATE_PATTERNS) {
    text = text.replace(pattern, '').trim()
  }
  return stripTopicContextSentences(text.trim())
}

function isBoilerplateExplanation(explanation) {
  const value = (explanation || '').trim()
  if (!value) return true
  if (/Study concept:/i.test(value)) return true
  if (/For Security\+, recognize/i.test(value)) return true
  if (/connect this term to/i.test(value)) return true
  if (/connect it to this topic focus/i.test(value)) return true
  if (/should be recognized by its full meaning/i.test(value)) return true
  if (/^This is [^.]+[.]?\s*$/i.test(value)) return true
  if (hasGenericBoilerplate(value)) return true
  return false
}

function isAcronymTerm(term) {
  return /^[A-Z][A-Z0-9/+.\-]{1,12}$/.test(String(term || '').trim())
}

function extractMemorizeDetail(memorize) {
  const parts = String(memorize || '')
    .split(/\s*[—–-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2) return parts.slice(1).join(' — ')

  const semi = String(memorize || '')
    .split(/;\s*/)
    .map((part) => part.trim().replace(/\.$/, ''))
    .filter(Boolean)
  if (semi.length >= 2) return semi.slice(1).join('; ')

  return ''
}

/** Security+ acronyms that appear without "stands for" in memorize text. */
const ACRONYM_EXPANSIONS = {
  IDS: {
    full: 'Intrusion Detection System',
    does: 'monitors network or host activity and generates alerts when it detects suspicious patterns.',
    extra: 'An IDS is usually passive (out-of-band) and does not block traffic — it alerts analysts to investigate.',
  },
  IPS: {
    full: 'Intrusion Prevention System',
    does: 'monitors traffic inline and can automatically block or drop malicious packets in real time.',
    extra: 'Because an IPS sits in the traffic path, misconfiguration can disrupt legitimate connections.',
  },
  HIDS: {
    full: 'Host-based Intrusion Detection System',
    does: 'monitors activity on a single endpoint such as logs, files, and processes for signs of compromise.',
    extra: 'HIDS focuses on one host rather than network-wide traffic.',
  },
  HIPS: {
    full: 'Host-based Intrusion Prevention System',
    does: 'runs on an endpoint and can block malicious activity on that host in real time.',
    extra: 'HIPS complements network IPS by protecting individual systems.',
  },
  NIDS: {
    full: 'Network-based Intrusion Detection System',
    does: 'monitors network traffic copies (via SPAN/TAP) to detect attacks crossing the network.',
    extra: 'NIDS analyzes packets without sitting inline in the traffic path.',
  },
  NIPS: {
    full: 'Network-based Intrusion Prevention System',
    does: 'inspects live network traffic inline and can drop malicious packets before they reach targets.',
    extra: 'NIPS provides active blocking at the network perimeter or segment boundary.',
  },
  'WIDS/WIPS': {
    full: 'Wireless Intrusion Detection/Prevention System',
    does: 'detects rogue access points, evil twins, and unauthorized wireless activity.',
    extra: 'WIPS can also contain or block rogue wireless threats automatically.',
  },
  VLAN: {
    full: 'Virtual Local Area Network',
    does: 'logically segments network traffic into separate broadcast domains on shared switches.',
    extra: 'VLANs limit lateral movement by separating users, servers, or departments.',
  },
  SNMP: {
    full: 'Simple Network Management Protocol',
    does: 'polls and reports device metrics such as CPU, memory, and interface status.',
    extra: 'Use SNMPv3 for encryption and authentication instead of legacy community strings.',
  },
  SIEM: {
    full: 'Security Information and Event Management',
    does: 'aggregates logs from many sources, correlates events, and generates security alerts.',
    extra: 'SIEMs help analysts detect patterns that single-device logs would miss.',
  },
  SOAR: {
    full: 'Security Orchestration, Automation, and Response',
    does: 'automates repetitive incident response tasks and coordinates tools through playbooks.',
    extra: 'SOAR reduces manual triage time and standardizes response workflows.',
  },
  ZTA: {
    full: 'Zero Trust Architecture',
    does: 'requires continuous verification of identity and device health — never trust, always verify.',
    extra: 'Every access request is authenticated, authorized, and encrypted regardless of network location.',
  },
  ZTNA: {
    full: 'Zero Trust Network Access',
    does: 'grants application access based on identity and policy instead of implicit VPN network trust.',
    extra: 'Users reach specific apps through a broker without full network-level access.',
  },
  SASE: {
    full: 'Secure Access Service Edge',
    does: 'delivers networking and security (SWG, CASB, FWaaS, ZTNA) from the cloud edge.',
    extra: 'SASE supports remote users without routing all traffic through a central data center VPN.',
  },
  PAP: {
    full: 'Password Authentication Protocol',
    does: 'sends credentials in plaintext and offers no protection against replay attacks.',
    extra: 'Avoid PAP when CHAP, EAP-TLS, or other stronger methods are available.',
  },
  CHAP: {
    full: 'Challenge-Handshake Authentication Protocol',
    does: 'authenticates using a challenge-response exchange instead of sending the password directly.',
    extra: 'CHAP is stronger than PAP but still weaker than modern EAP-TLS methods.',
  },
  EAP: {
    full: 'Extensible Authentication Protocol',
    does: 'is a framework supporting multiple authentication methods inside 802.1X port-based access.',
    extra: 'EAP-TLS and PEAP are common enterprise wireless and VPN authentication methods.',
  },
  'EAP-TLS': {
    full: 'Extensible Authentication Protocol-Transport Layer Security',
    does: 'uses digital certificates for mutual authentication between client and server.',
    extra: 'EAP-TLS is one of the strongest wireless authentication options.',
  },
  EOL: {
    full: 'End of Life',
    does: 'means a product no longer receives vendor patches or security updates.',
    extra: 'Running EOL systems is high risk because new vulnerabilities will never be fixed.',
  },
  FDE: {
    full: 'Full Disk Encryption',
    does: 'encrypts entire storage volumes so data is unreadable if a device is lost or stolen.',
    extra: 'BitLocker and FileVault are common FDE implementations.',
  },
  ECC: {
    full: 'Elliptic Curve Cryptography',
    does: 'provides strong asymmetric encryption and signatures with smaller keys than RSA.',
    extra: 'ECC is widely used in mobile devices and modern TLS certificates.',
  },
  MD5: {
    full: 'Message Digest 5',
    does: 'is a legacy hash algorithm with known collision weaknesses.',
    extra: 'Do not use MD5 for security purposes — prefer SHA-256 or stronger.',
  },
  OCSP: {
    full: 'Online Certificate Status Protocol',
    does: 'checks in real time whether a digital certificate has been revoked.',
    extra: 'OCSP stapling reduces latency by attaching the status to the TLS handshake.',
  },
  PGP: {
    full: 'Pretty Good Privacy',
    does: 'encrypts and signs email and files using a web of trust or key pairs.',
    extra: 'PGP provides end-to-end encryption outside centralized certificate authorities.',
  },
  'S/MIME': {
    full: 'Secure/Multipurpose Internet Mail Extensions',
    does: 'signs and encrypts email using X.509 certificates.',
    extra: 'S/MIME proves sender identity and protects message confidentiality.',
  },
  CRL: {
    full: 'Certificate Revocation List',
    does: 'is a published list of digital certificates that are no longer trusted.',
    extra: 'Clients check the CRL before trusting a certificate, though OCSP is faster for real-time checks.',
  },
  EDR: {
    full: 'Endpoint Detection and Response',
    does: 'monitors endpoints for advanced threats and supports investigation and containment.',
    extra: 'EDR goes beyond traditional antivirus with behavioral analysis and response actions.',
  },
  NAC: {
    full: 'Network Access Control',
    does: 'checks device health and identity before allowing network access.',
    extra: 'NAC can quarantine non-compliant endpoints until they meet security policy.',
  },
  WAF: {
    full: 'Web Application Firewall',
    does: 'filters HTTP/HTTPS traffic to block web attacks such as SQL injection and XSS.',
    extra: 'WAFs protect applications at Layer 7, not just the network perimeter.',
  },
  PSK: {
    full: 'Pre-Shared Key',
    does: 'is a shared password used for Wi-Fi authentication in WPA2-Personal networks.',
    extra: 'PSK is simpler than enterprise 802.1X but harder to revoke per user.',
  },
  WPA3: {
    full: 'Wi-Fi Protected Access 3',
    does: 'is the latest Wi-Fi security standard using SAE to resist offline password guessing.',
    extra: 'WPA3 replaces WPA2 and improves protection on open and password-based networks.',
  },
  WPA2: {
    full: 'Wi-Fi Protected Access 2',
    does: 'uses AES encryption and CCMP for wireless security.',
    extra: 'WPA2 replaced WEP and WPA; WPA3 is the current recommended standard.',
  },
  WEP: {
    full: 'Wired Equivalent Privacy',
    does: 'is an obsolete Wi-Fi encryption standard with serious cryptographic flaws.',
    extra: 'WEP can be cracked in minutes — never use it in production networks.',
  },
  COPE: {
    full: 'Corporate-Owned, Personally Enabled',
    does: 'is a device ownership model where the company owns the device but allows limited personal use.',
    extra: 'COPE balances IT control with employee flexibility compared to strict COBO.',
  },
  MAM: {
    full: 'Mobile Application Management',
    does: 'controls and secures specific apps and data without managing the entire device.',
    extra: 'MAM is useful when full MDM is not acceptable on personal devices.',
  },
  TOTP: {
    full: 'Time-based One-Time Password',
    does: 'generates a short-lived numeric code from a shared secret and current time.',
    extra: 'Authenticator apps use TOTP as a common MFA factor.',
  },
  XML: {
    full: 'Extensible Markup Language',
    does: 'structures data in a human-readable tagged format used by SAML and many APIs.',
    extra: 'XML signatures and encryption support federated identity and secure document exchange.',
  },
  NTLM: {
    full: 'NT LAN Manager',
    does: 'is a legacy Microsoft challenge-response authentication protocol.',
    extra: 'NTLM is vulnerable to relay attacks — Kerberos is preferred in modern domains.',
  },
  UEBA: {
    full: 'User and Entity Behavior Analytics',
    does: 'detects anomalies in user and device behavior that may indicate insider threats or compromised accounts.',
    extra: 'UEBA establishes baselines and flags deviations such as unusual login times or data access.',
  },
  CASB: {
    full: 'Cloud Access Security Broker',
    does: 'monitors and enforces security policy between users and cloud services.',
    extra: 'CASBs provide visibility, DLP, and access control for SaaS applications.',
  },
  IaC: {
    full: 'Infrastructure as Code',
    does: 'defines infrastructure through machine-readable templates for repeatable deployments.',
    extra: 'IaC misconfigurations can spread quickly — scan templates before deployment.',
  },
  'SD-WAN': {
    full: 'Software-Defined Wide Area Network',
    does: 'routes WAN traffic across multiple links using centralized policy and encryption.',
    extra: 'SD-WAN improves resilience and can replace expensive MPLS for branch offices.',
  },
  UTM: {
    full: 'Unified Threat Management',
    does: 'combines firewall, IPS, antivirus, and other perimeter controls in one appliance.',
    extra: 'UTM simplifies small-office security but can become a single point of failure.',
  },
  ARP: {
    full: 'Address Resolution Protocol',
    does: 'maps IPv4 addresses to MAC addresses on a local network segment.',
    extra: 'ARP spoofing attacks exploit this mapping to redirect or intercept traffic.',
  },
  DNS: {
    full: 'Domain Name System',
    does: 'resolves human-readable domain names to IP addresses.',
    extra: 'DNS poisoning or hijacking can redirect users to malicious sites.',
  },
  URL: {
    full: 'Uniform Resource Locator',
    does: 'identifies a specific web resource such as a page, file, or API endpoint.',
    extra: 'Malicious URLs are a common phishing and malware delivery vector.',
  },
  IOC: {
    full: 'Indicator of Compromise',
    does: 'is an artifact that suggests a system or account has been breached.',
    extra: 'Examples include malicious file hashes, IP addresses, domains, and registry keys.',
  },
  SBOM: {
    full: 'Software Bill of Materials',
    does: 'lists all components, libraries, and dependencies in a software product.',
    extra: 'SBOMs help teams quickly identify exposure when a third-party vulnerability is disclosed.',
  },
  SPIM: {
    full: 'Spam over Instant Messaging',
    does: 'is unsolicited or malicious content sent through chat or messaging platforms.',
    extra: 'Like email spam, SPIM can deliver phishing links or malware.',
  },
  MFA: {
    full: 'Multi-Factor Authentication',
    does: 'requires two or more verification factors before granting access.',
    extra: 'Factors include something you know, have, or are (password, token, biometric).',
  },
  WAF: {
    full: 'Web Application Firewall',
    does: 'filters HTTP/HTTPS traffic to block web attacks such as SQL injection and XSS.',
    extra: 'WAFs protect applications at Layer 7, not just the network perimeter.',
  },
  SAST: {
    full: 'Static Application Security Testing',
    does: 'analyzes source code for vulnerabilities without running the application.',
    extra: 'SAST finds flaws early in development before code is deployed.',
  },
  DAST: {
    full: 'Dynamic Application Security Testing',
    does: 'tests a running application from the outside to find exploitable weaknesses.',
    extra: 'DAST simulates attacker behavior against live or staging environments.',
  },
  EDR: {
    full: 'Endpoint Detection and Response',
    does: 'monitors endpoints for advanced threats and supports investigation and containment.',
    extra: 'EDR goes beyond traditional antivirus with behavioral analysis and response actions.',
  },
  XDR: {
    full: 'Extended Detection and Response',
    does: 'correlates telemetry across endpoints, network, cloud, and email for broader threat detection.',
    extra: 'XDR unifies visibility that would otherwise be siloed in separate tools.',
  },
  CVE: {
    full: 'Common Vulnerabilities and Exposures',
    does: 'is a public catalog identifier for a known security vulnerability.',
    extra: 'CVE IDs let teams track and prioritize patching across vendors and tools.',
  },
  PKI: {
    full: 'Public Key Infrastructure',
    does: 'manages digital certificates and public-private key pairs for secure communication.',
    extra: 'PKI supports TLS, code signing, and encrypted email through trusted CAs.',
  },
  ACL: {
    full: 'Access Control List',
    does: 'defines which users or systems may access specific resources and what actions they can perform.',
    extra: 'ACLs appear on firewalls, routers, and file systems to enforce least privilege.',
  },
  RBAC: {
    full: 'Role-Based Access Control',
    does: 'grants permissions based on job role rather than individual user identity.',
    extra: 'RBAC simplifies administration when many users share similar duties.',
  },
  DAC: {
    full: 'Discretionary Access Control',
    does: 'lets resource owners decide who gets access to their objects.',
    extra: 'DAC is flexible but can lead to inconsistent permissions if owners over-share.',
  },
  MAC: {
    full: 'Mandatory Access Control',
    does: 'enforces access based on system-defined security labels that users cannot change.',
    extra: 'MAC is common in military and high-assurance environments.',
  },
  ABAC: {
    full: 'Attribute-Based Access Control',
    does: 'grants access based on attributes such as role, location, device health, and time.',
    extra: 'ABAC supports fine-grained, dynamic policies beyond simple roles.',
  },
  SSO: {
    full: 'Single Sign-On',
    does: 'lets users authenticate once and access multiple applications without re-entering credentials.',
    extra: 'SSO improves usability but makes the identity provider a high-value target.',
  },
  SAML: {
    full: 'Security Assertion Markup Language',
    does: 'is an XML-based standard for exchanging authentication and authorization data between parties.',
    extra: 'SAML is widely used for enterprise SSO and federation.',
  },
  OIDC: {
    full: 'OpenID Connect',
    does: 'is an identity layer on top of OAuth 2.0 for user authentication.',
    extra: 'OIDC returns identity tokens so apps can verify who logged in.',
  },
  NAC: {
    full: 'Network Access Control',
    does: 'checks device health and identity before allowing network access.',
    extra: 'NAC can quarantine non-compliant endpoints until they meet security policy.',
  },
  DMZ: {
    full: 'Demilitarized Zone',
    does: 'is a network segment that exposes public-facing services while isolating the internal LAN.',
    extra: 'DMZ design limits damage if a web server is compromised.',
  },
  VPN: {
    full: 'Virtual Private Network',
    does: 'creates an encrypted tunnel over an untrusted network for secure remote access.',
    extra: 'VPNs protect confidentiality and integrity of data in transit.',
  },
  TLS: {
    full: 'Transport Layer Security',
    does: 'encrypts data in transit between clients and servers.',
    extra: 'TLS is the modern replacement for SSL and protects web, email, and API traffic.',
  },
  AES: {
    full: 'Advanced Encryption Standard',
    does: 'is a symmetric block cipher widely used to encrypt data at rest and in transit.',
    extra: 'AES-256 is the current gold standard for bulk encryption.',
  },
  RSA: {
    full: 'Rivest-Shamir-Adleman',
    does: 'is an asymmetric algorithm used for key exchange and digital signatures.',
    extra: 'RSA key length affects strength; 2048-bit minimum is common for certificates.',
  },
  SHA: {
    full: 'Secure Hash Algorithm',
    does: 'produces a fixed-length hash to verify data integrity.',
    extra: 'SHA-256 is preferred; SHA-1 and MD5 are considered weak for security use.',
  },
  HMAC: {
    full: 'Hash-based Message Authentication Code',
    does: 'combines a hash function with a secret key to verify message integrity and authenticity.',
    extra: 'HMAC proves the message was not altered and came from someone with the key.',
  },
  HSM: {
    full: 'Hardware Security Module',
    does: 'is a tamper-resistant device that generates and stores cryptographic keys.',
    extra: 'HSMs protect keys even if the host operating system is compromised.',
  },
  TPM: {
    full: 'Trusted Platform Module',
    does: 'is a chip that stores keys, measurements, and attestation data for device integrity.',
    extra: 'TPM supports secure boot, BitLocker, and device identity verification.',
  },
  PII: {
    full: 'Personally Identifiable Information',
    does: 'is data that can identify a specific individual such as name, SSN, or email.',
    extra: 'PII requires protection under privacy laws and organizational policy.',
  },
  PHI: {
    full: 'Protected Health Information',
    does: 'is health-related data linked to an individual, regulated under HIPAA.',
    extra: 'PHI demands strict access controls, encryption, and audit logging.',
  },
  PCI: {
    full: 'Payment Card Industry',
    does: 'refers to standards (PCI DSS) that protect cardholder data.',
    extra: 'Merchants and processors must validate compliance based on transaction volume.',
  },
  GDPR: {
    full: 'General Data Protection Regulation',
    does: 'is the EU law governing personal data collection, processing, and breach notification.',
    extra: 'GDPR emphasizes consent, data minimization, and individual privacy rights.',
  },
  HIPAA: {
    full: 'Health Insurance Portability and Accountability Act',
    does: 'sets U.S. requirements for protecting health information and breach reporting.',
    extra: 'Covered entities must implement administrative, physical, and technical safeguards.',
  },
  BCP: {
    full: 'Business Continuity Plan',
    does: 'documents how the organization maintains operations during disruptions.',
    extra: 'BCP covers people, processes, and alternate work locations.',
  },
  DRP: {
    full: 'Disaster Recovery Plan',
    does: 'focuses on restoring IT systems and data after a major outage or disaster.',
    extra: 'DRP defines RPO/RTO targets and recovery procedures for critical systems.',
  },
  RPO: {
    full: 'Recovery Point Objective',
    does: 'is the maximum acceptable amount of data loss measured in time.',
    extra: 'RPO drives backup frequency — a 1-hour RPO means backups at least every hour.',
  },
  RTO: {
    full: 'Recovery Time Objective',
    does: 'is the maximum acceptable downtime before services must be restored.',
    extra: 'RTO drives redundancy and failover design decisions.',
  },
  MTBF: {
    full: 'Mean Time Between Failures',
    does: 'estimates average uptime between hardware failures.',
    extra: 'Higher MTBF indicates more reliable equipment.',
  },
  MTTR: {
    full: 'Mean Time to Repair',
    does: 'measures average time to restore a failed component to operation.',
    extra: 'Lower MTTR improves availability during incidents.',
  },
  APT: {
    full: 'Advanced Persistent Threat',
    does: 'is a skilled, long-term attacker (often nation-state) that maintains covert access.',
    extra: 'APTs use custom malware, lateral movement, and data exfiltration over months.',
  },
  DLP: {
    full: 'Data Loss Prevention',
    does: 'monitors and blocks unauthorized sharing of sensitive data in use, motion, and at rest.',
    extra: 'DLP can alert on or block emails, uploads, and clipboard copies of classified data.',
  },
  MDM: {
    full: 'Mobile Device Management',
    does: 'enforces security policies on smartphones and tablets such as encryption and remote wipe.',
    extra: 'MDM is central to BYOD and corporate-owned mobile programs.',
  },
  BYOD: {
    full: 'Bring Your Own Device',
    does: 'allows employees to use personal devices for work under organizational policy.',
    extra: 'BYOD requires containerization or MDM to separate personal and corporate data.',
  },
  API: {
    full: 'Application Programming Interface',
    does: 'defines how software components communicate and exchange data.',
    extra: 'Insecure APIs are a top web application risk (OWASP API Security).',
  },
  Syslog: {
    full: 'System Logging Protocol',
    does: 'is a standard for forwarding log messages from devices to a central collector.',
    extra: 'Centralized syslog feeds SIEM correlation and long-term retention.',
  },
  NetFlow: {
    full: 'Network Flow Analysis',
    does: 'summarizes traffic patterns such as source, destination, ports, and volume.',
    extra: 'NetFlow helps detect data exfiltration and unusual communication patterns.',
  },
  RADIUS: {
    full: 'Remote Authentication Dial-In User Service',
    does: 'provides AAA services for network access authentication and accounting.',
    extra: 'RADIUS commonly uses UDP ports 1812 for authentication and 1813 for accounting.',
  },
  'TACACS+': {
    full: 'Terminal Access Controller Access-Control System Plus',
    does: 'is a Cisco AAA protocol that encrypts the entire payload and separates auth functions.',
    extra: 'TACACS+ typically uses TCP port 49.',
  },
  LDAP: {
    full: 'Lightweight Directory Access Protocol',
    does: 'looks up users, groups, and device information in a centralized directory.',
    extra: 'LDAP supports identity management and SSO integrations.',
  },
  WPA: {
    full: 'Wi-Fi Protected Access',
    does: 'is an older wireless security standard that improved on WEP.',
    extra: 'WPA has been superseded by WPA2 and WPA3.',
  },
  WPA2: {
    full: 'Wi-Fi Protected Access 2',
    does: 'secures wireless networks using AES-CCMP encryption.',
    extra: 'WPA2 replaced WPA and WEP as the common enterprise Wi-Fi standard.',
  },
  WPA3: {
    full: 'Wi-Fi Protected Access 3',
    does: 'is the latest Wi-Fi security standard using SAE to resist offline password guessing.',
    extra: 'WPA3 replaces WPA2-Personal weaknesses against brute-force attacks.',
  },
  WPS: {
    full: 'Wi-Fi Protected Setup',
    does: 'simplifies connecting devices to Wi-Fi, often via a PIN or push button.',
    extra: 'WPS PIN mode is vulnerable to brute force and should be disabled.',
  },
  SAE: {
    full: 'Simultaneous Authentication of Equals',
    does: 'is the WPA3 handshake that replaces the WPA2 PSK four-way handshake.',
    extra: 'SAE protects against offline dictionary attacks on the password.',
  },
  WAP: {
    full: 'Wireless Access Point',
    does: 'connects wireless clients to a wired network.',
    extra: 'Rogue WAPs are a common wireless attack vector.',
  },
  NFC: {
    full: 'Near Field Communication',
    does: 'enables short-range wireless data exchange between devices.',
    extra: 'NFC is used for tap-to-pay and physical access cards.',
  },
  COPE: {
    full: 'Corporate-Owned, Personally Enabled',
    does: 'is a device model where the company owns hardware but allows limited personal use.',
    extra: 'COPE balances IT control with employee flexibility.',
  },
  PIN: {
    full: 'Personal Identification Number',
    does: 'is a numeric code used as an authentication factor.',
    extra: 'PINs are weaker than passphrases and should not be reused across systems.',
  },
  FIDO2: {
    full: 'Fast Identity Online 2',
    does: 'enables phishing-resistant authentication using hardware security keys or biometrics.',
    extra: 'FIDO2 uses public-key cryptography instead of shared passwords.',
  },
  SID: {
    full: 'Security Identifier',
    does: 'uniquely identifies a Windows user, group, or computer account.',
    extra: 'SIDs remain constant even if the account display name changes.',
  },
  LSASS: {
    full: 'Local Security Authority Subsystem Service',
    does: 'enforces security policy and validates logons on Windows systems.',
    extra: 'Attackers target LSASS memory to extract credentials in credential dumping attacks.',
  },
  SAM: {
    full: 'Security Account Manager',
    does: 'stores local Windows account password hashes.',
    extra: 'SAM database extraction is a common post-exploitation technique.',
  },
  CSP: {
    full: 'Cloud Service Provider',
    does: 'offers hosted computing, storage, and platform services.',
    extra: 'Shared responsibility models define which security tasks belong to the CSP vs customer.',
  },
  CDN: {
    full: 'Content Delivery Network',
    does: 'distributes cached content from edge servers closer to users.',
    extra: 'CDNs improve performance and can absorb some DDoS traffic.',
  },
  SCAP: {
    full: 'Security Content Automation Protocol',
    does: 'standardizes automated vulnerability assessment and compliance checking.',
    extra: 'SCAP feeds power tools that scan for misconfigurations against benchmarks.',
  },
  UPS: {
    full: 'Uninterruptible Power Supply',
    does: 'provides battery backup during power outages.',
    extra: 'UPS protects availability for servers and network gear during brief outages.',
  },
  RAID: {
    full: 'Redundant Array of Independent Disks',
    does: 'combines multiple drives for redundancy or performance.',
    extra: 'RAID supports availability but is not a substitute for backups.',
  },
  CMDB: {
    full: 'Configuration Management Database',
    does: 'tracks IT assets, configurations, and relationships.',
    extra: 'A CMDB supports change management and incident response with accurate asset data.',
  },
  USB: {
    full: 'Universal Serial Bus',
    does: 'is a common interface for removable storage and peripherals.',
    extra: 'USB devices can introduce malware or enable data exfiltration.',
  },
  CCTV: {
    full: 'Closed-Circuit Television',
    does: 'provides video surveillance of facilities.',
    extra: 'CCTV is a physical security control for monitoring and deterrence.',
  },
  HVAC: {
    full: 'Heating, Ventilation, and Air Conditioning',
    does: 'controls environmental conditions in buildings and server rooms.',
    extra: 'HVAC failures can cause overheating and hardware damage.',
  },
  CIRT: {
    full: 'Cyber Incident Response Team',
    does: 'coordinates detection, analysis, containment, and recovery during security incidents.',
    extra: 'CIRT members follow the incident response plan and communicate with stakeholders.',
  },
  TTP: {
    full: 'Tactics, Techniques, and Procedures',
    does: 'describe how threat actors operate and attack.',
    extra: 'MITRE ATT&CK catalogs TTPs for threat intelligence and detection engineering.',
  },
  AUP: {
    full: 'Acceptable Use Policy',
    does: 'defines permitted and prohibited use of organizational systems.',
    extra: 'AUP violations can be grounds for disciplinary action.',
  },
  CIS: {
    full: 'Center for Internet Security',
    does: 'publishes security benchmarks and hardening guides.',
    extra: 'CIS Controls are widely used baseline security recommendations.',
  },
  NIST: {
    full: 'National Institute of Standards and Technology',
    does: 'publishes U.S. cybersecurity frameworks and standards such as the CSF and SP 800-series.',
    extra: 'NIST guidance is referenced across government and industry compliance programs.',
  },
  'ISO/IEC': {
    full: 'International Organization for Standardization / International Electrotechnical Commission',
    does: 'publish international technology and security standards.',
    extra: 'ISO/IEC 27001 is a common information security management standard.',
  },
  SOP: {
    full: 'Standard Operating Procedure',
    does: 'documents repeatable steps for operational tasks.',
    extra: 'SOPs ensure consistent and auditable security processes.',
  },
  CISO: {
    full: 'Chief Information Security Officer',
    does: 'leads the organization\'s information security program.',
    extra: 'The CISO reports on risk, strategy, and compliance to executive leadership.',
  },
  XSS: {
    full: 'Cross-Site Scripting',
    does: 'injects malicious scripts into web pages viewed by other users.',
    extra: 'XSS can steal session cookies and hijack authenticated sessions.',
  },
  CSRF: {
    full: 'Cross-Site Request Forgery',
    does: 'tricks an authenticated user\'s browser into submitting unwanted requests.',
    extra: 'Anti-CSRF tokens and SameSite cookies help prevent forged actions.',
  },
  OSINT: {
    full: 'Open-Source Intelligence',
    does: 'gathers publicly available information for reconnaissance or investigation.',
    extra: 'OSINT includes social media, DNS records, and breach databases.',
  },
  CVSS: {
    full: 'Common Vulnerability Scoring System',
    does: 'rates vulnerability severity on a standardized 0–10 scale.',
    extra: 'CVSS scores help prioritize patching based on exploitability and impact.',
  },
  'SAST/DAST': {
    full: 'Static/Dynamic Application Security Testing',
    does: 'finds code flaws before deployment (SAST) and in running apps (DAST).',
    extra: 'Use both: SAST in CI/CD pipelines and DAST against staging environments.',
  },
  RIPEMD: {
    full: 'RACE Integrity Primitives Evaluation Message Digest',
    does: 'is a family of cryptographic hash functions.',
    extra: 'RIPEMD-160 is used in some blockchain implementations; prefer SHA-256 for new designs.',
  },
  NGFW: {
    full: 'Next-Generation Firewall',
    does: 'inspects traffic at Layers 3–7 with application awareness and IPS capabilities.',
    extra: 'NGFWs go beyond port-based rules to identify applications and users.',
  },
  SWG: {
    full: 'Secure Web Gateway',
    does: 'filters web traffic to block malicious sites, downloads, and policy violations.',
    extra: 'SWGs are a core component of SASE architectures.',
  },
  VDI: {
    full: 'Virtual Desktop Infrastructure',
    does: 'hosts desktop environments centrally for remote access.',
    extra: 'VDI reduces local data exposure on endpoint devices.',
  },
  VM: {
    full: 'Virtual Machine',
    does: 'runs an isolated operating system instance on shared hardware.',
    extra: 'VM escape vulnerabilities can break isolation between guests.',
  },
  AAA: {
    full: 'Authentication, Authorization, and Accounting',
    does: 'proves identity, enforces permissions, and records activity.',
    extra: 'RADIUS and TACACS+ are common AAA implementations for network access.',
  },
  'SHA-256': {
    full: 'Secure Hash Algorithm 256-bit',
    does: 'produces a 256-bit hash for integrity verification.',
    extra: 'SHA-256 is the current standard for digital fingerprints and blockchain.',
  },
  'SHA-1': {
    full: 'Secure Hash Algorithm 1',
    does: 'is a legacy hash function with known collision weaknesses.',
    extra: 'Avoid SHA-1 for digital signatures; use SHA-256 or stronger.',
  },
  SAN: {
    full: 'Subject Alternative Name',
    does: 'lists additional DNS names or IP addresses covered by a certificate.',
    extra: 'SANs let one certificate protect multiple hostnames.',
  },
  EPSS: {
    full: 'Exploit Prediction Scoring System',
    does: 'estimates the likelihood a vulnerability will be exploited in the wild.',
    extra: 'EPSS helps prioritize patching beyond CVSS severity alone.',
  },
  CWE: {
    full: 'Common Weakness Enumeration',
    does: 'categorizes types of software weaknesses such as buffer overflows.',
    extra: 'CWE describes weakness classes; CVE identifies specific instances.',
  },
  CPE: {
    full: 'Common Platform Enumeration',
    does: 'standardizes product names for vulnerability matching.',
    extra: 'CPE strings link CVEs to specific software versions in scanners.',
  },
  NDR: {
    full: 'Network Detection and Response',
    does: 'analyzes network traffic for threats and anomalies.',
    extra: 'NDR provides visibility when endpoint agents are not deployed.',
  },
  CPU: {
    full: 'Central Processing Unit',
    does: 'utilization metrics can reveal overload, crypto-mining, or attack activity.',
    extra: 'Sudden CPU spikes may indicate malware or resource exhaustion attacks.',
  },
  RAM: {
    full: 'Random Access Memory',
    does: 'utilization affects system stability and forensic investigation context.',
    extra: 'Memory forensics captures RAM contents before volatile evidence is lost.',
  },
  SSH: {
    full: 'Secure Shell',
    does: 'provides encrypted remote administration and file transfer.',
    extra: 'SSH replaces insecure Telnet and FTP for remote access.',
  },
  FTP: {
    full: 'File Transfer Protocol',
    does: 'transfers files in plaintext without encryption.',
    extra: 'Replace FTP with SFTP or FTPS to protect credentials and data.',
  },
  DNSSEC: {
    full: 'Domain Name System Security Extensions',
    does: 'adds cryptographic signatures to DNS responses for integrity.',
    extra: 'DNSSEC prevents DNS spoofing but does not encrypt queries.',
  },
  SMTP: {
    full: 'Simple Mail Transfer Protocol',
    does: 'transfers email between mail servers.',
    extra: 'Use TLS (SMTPS or STARTTLS) to protect email in transit.',
  },
  SMTPS: {
    full: 'Simple Mail Transfer Protocol Secure',
    does: 'wraps SMTP in TLS for encrypted email delivery.',
    extra: 'SMTPS protects message content during server-to-server transfer.',
  },
  LDAPS: {
    full: 'Lightweight Directory Access Protocol over SSL/TLS',
    does: 'encrypts LDAP directory queries and authentication.',
    extra: 'LDAPS protects credentials and directory data in transit.',
  },
  FIM: {
    full: 'File Integrity Monitoring',
    does: 'compares file hashes against a baseline to detect unauthorized changes.',
    extra: 'FIM alerts on modified system files, configs, or critical binaries.',
  },
  UBA: {
    full: 'User Behavior Analytics',
    does: 'detects anomalous user activity that may indicate compromise.',
    extra: 'UBA is a predecessor concept to UEBA; both focus on behavioral baselines.',
  },
  ASLR: {
    full: 'Address Space Layout Randomization',
    does: 'randomizes memory locations to make exploit development harder.',
    extra: 'ASLR is a common OS exploit mitigation alongside DEP.',
  },
  PUP: {
    full: 'Potentially Unwanted Program',
    does: 'is software that may be risky, intrusive, or violate policy.',
    extra: 'PUPs include adware and browser toolbars that expand attack surface.',
  },
  RFC: {
    full: 'Request for Comments',
    does: 'documents internet standards and protocols.',
    extra: 'Security-relevant RFCs define TLS, IPsec, and email authentication standards.',
  },
  ALE: {
    full: 'Annualized Loss Expectancy',
    does: 'estimates expected yearly loss from a risk (SLE × ARO).',
    extra: 'ALE helps compare the cost of controls versus potential losses.',
  },
  SLE: {
    full: 'Single Loss Expectancy',
    does: 'estimates the monetary loss from one occurrence of a risk.',
    extra: 'SLE equals asset value multiplied by exposure factor.',
  },
  ARO: {
    full: 'Annualized Rate of Occurrence',
    does: 'estimates how often a threat is expected per year.',
    extra: 'ARO multiplied by SLE gives annualized loss expectancy.',
  },
  BIA: {
    full: 'Business Impact Analysis',
    does: 'identifies critical functions and the impact of disruptions.',
    extra: 'BIA results drive RTO, RPO, and continuity planning priorities.',
  },
  MTD: {
    full: 'Maximum Tolerable Downtime',
    does: 'is the longest outage a business function can endure.',
    extra: 'MTD informs disaster recovery and continuity requirements.',
  },
  SLA: {
    full: 'Service Level Agreement',
    does: 'defines measurable service commitments between provider and customer.',
    extra: 'SLAs include uptime targets and penalties for missed performance.',
  },
  MOU: {
    full: 'Memorandum of Understanding',
    does: 'documents non-binding intent to cooperate between parties.',
    extra: 'MOUs precede formal contracts like ISAs or BPAs.',
  },
  ISA: {
    full: 'Interconnection Security Agreement',
    does: 'defines security requirements between interconnected organizations.',
    extra: 'ISAs govern data sharing, incident notification, and access controls.',
  },
  BPA: {
    full: 'Business Partnership Agreement',
    does: 'formalizes a business relationship including security expectations.',
    extra: 'BPAs often include liability and data protection clauses.',
  },
  NDA: {
    full: 'Non-Disclosure Agreement',
    does: 'protects confidential information shared between parties.',
    extra: 'NDAs are common before vendor assessments and mergers.',
  },
  SOW: {
    full: 'Statement of Work',
    does: 'defines project scope, deliverables, and timelines.',
    extra: 'SOWs should include security requirements for vendor projects.',
  },
  ROE: {
    full: 'Rules of Engagement',
    does: 'define scope, limits, and authorization for penetration tests.',
    extra: 'ROE prevents testers from exceeding agreed targets or methods.',
  },
  'KPI/KRI': {
    full: 'Key Performance / Key Risk Indicators',
    does: 'measure program effectiveness and emerging risk trends.',
    extra: 'KPIs track performance; KRIs provide early warning of rising risk.',
  },
  CCPA: {
    full: 'California Consumer Privacy Act',
    does: 'grants California residents rights over personal data collection and sale.',
    extra: 'CCPA requires disclosure, opt-out, and deletion mechanisms.',
  },
  SDLC: {
    full: 'Software Development Life Cycle',
    does: 'organizes planning, design, coding, testing, deployment, and maintenance.',
    extra: 'Secure SDLC integrates security reviews at each phase.',
  },
  IAST: {
    full: 'Interactive Application Security Testing',
    does: 'analyzes running applications with instrumentation to find vulnerabilities.',
    extra: 'IAST combines aspects of SAST and DAST during testing.',
  },
  STIX: {
    full: 'Structured Threat Information Expression',
    does: 'standardizes how threat intelligence is represented and shared.',
    extra: 'STIX defines objects for indicators, campaigns, and threat actors.',
  },
  TAXII: {
    full: 'Trusted Automated Exchange of Intelligence Information',
    does: 'transports threat intelligence between organizations and tools.',
    extra: 'TAXII feeds deliver STIX-formatted IOCs to SIEM and SOAR platforms.',
  },
  IOA: {
    full: 'Indicator of Attack',
    does: 'describes behaviors suggesting an attack is actively in progress.',
    extra: 'IOAs focus on techniques and behaviors rather than static IOC artifacts.',
  },
  PAM: {
    full: 'Privileged Access Management',
    does: 'controls, vaults, and monitors administrative and high-risk accounts.',
    extra: 'PAM enforces just-in-time access and session recording for admins.',
  },
  VPC: {
    full: 'Virtual Private Cloud',
    does: 'logically isolates cloud resources within a provider\'s shared infrastructure.',
    extra: 'VPCs enable network segmentation in cloud environments.',
  },
}

function getAcronymFullName(term, memorize) {
  if (ACRONYM_EXPANSIONS[term]?.full) return ACRONYM_EXPANSIONS[term].full
  const match = (memorize || '').match(/stands for\s+(.+?)\.?$/i)
  if (match) return match[1].replace(/\.\s*$/, '').trim()
  return null
}

function explanationSpellsAcronym(term, explanation) {
  if (!explanation || !isAcronymTerm(term)) return false
  const escaped = escapeRegex(term)
  return new RegExp(`\\(${escaped}\\)`, 'i').test(explanation)
}

function buildAcronymExpansionExplanation(term) {
  const entry = ACRONYM_EXPANSIONS[term]
  if (!entry) return ''
  const first = ensureSentence(`${entry.full} (${term}) ${entry.does}`)
  const second = entry.extra ? ensureSentence(entry.extra) : ''
  return dedupeSentences(`${first} ${second}`.trim())
}

function acronymMissingFromExplanation(term, explanation, memorize = '') {
  if (!isAcronymTerm(term)) return false
  if (explanationSpellsAcronym(term, explanation)) return false
  return Boolean(getAcronymFullName(term, memorize))
}

function ensureAcronymSpelledOut(term, explanation, memorize) {
  if (!isAcronymTerm(term)) return explanation

  let text = (explanation || '').trim()
  const standsMatch = text.match(
    new RegExp(`^${escapeRegex(term)}\\s+stands for\\s+(.+?)[.]?\\s*(.*)$`, 'is'),
  )
  if (standsMatch) {
    const fullName = standsMatch[1].replace(/\.\s*$/, '').trim()
    const rest = standsMatch[2].trim()
    text = capitalizeExplanation(
      dedupeSentences(
        `${ensureSentence(`${fullName} (${term}) ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`)}`,
      ),
    )
    if (explanationSpellsAcronym(term, text)) return text
  }

  if (explanationSpellsAcronym(term, text)) return text

  const rebuilt = buildAcronymExpansionExplanation(term)
  if (rebuilt) return rebuilt

  if (/stands for/i.test(memorize || '')) {
    return expandAcronymExplanation(term, memorize)
  }

  const fullName = getAcronymFullName(term, memorize)
  if (!fullName) return text

  let body = text
  body = body.replace(new RegExp(`^${escapeRegex(term)}\\s+is\\s+(the\\s+)?`, 'i'), '')
  body = body.replace(new RegExp(`^${escapeRegex(term)}\\s+`, 'i'), '')
  if (body.toLowerCase().startsWith(fullName.toLowerCase())) {
    body = body.slice(fullName.length).replace(/^\s*(is\s+)?/i, '').trim()
  }
  if (!body) return text

  const lead = /^[A-Z]/.test(body) ? body.charAt(0).toLowerCase() + body.slice(1) : body
  return capitalizeExplanation(ensureSentence(`${fullName} (${term}) ${lead}`))
}

function normalizeForCompare(value) {
  return normalize(value).replace(/[.!?]+$/g, '')
}

function expandAcronymExplanation(term, memorize) {
  if (ACRONYM_EXPANSIONS[term]) {
    return buildAcronymExpansionExplanation(term)
  }

  const match = memorize.match(/stands for\s+(.+?)\.?$/i)
  const fullName = match ? match[1].replace(/\.\s*$/, '').trim() : term
  const context = acronymSecurityContext(fullName)
  const extra = acronymExamHint(term, fullName)
  const first = ensureSentence(`${fullName} (${term}) ${context}`)
  if (!extra || hasGenericBoilerplate(extra)) return first
  return dedupeSentences(`${first} ${extra}`)
}

function acronymExamHint(term, fullName) {
  const lower = fullName.toLowerCase()
  if (lower.includes('access point')) {
    return 'Wireless access points must be secured and monitored to prevent rogue AP attacks.'
  }
  if (lower.includes('next-generation firewall')) {
    return 'NGFWs provide deeper inspection than traditional firewalls, including application awareness.'
  }
  if (lower.includes('secure web gateway')) {
    return 'SWGs filter web traffic and help block malicious sites, downloads, and policy violations.'
  }
  if (lower.includes('virtual desktop')) {
    return 'Virtual desktop environments centralize user workloads and can reduce local data exposure.'
  }
  if (lower.includes('virtual machine')) {
    return 'VMs isolate workloads, but misconfiguration or escape vulnerabilities can still create risk.'
  }
  if (lower.includes('virtual private cloud')) {
    return 'VPCs isolate cloud resources logically, supporting segmentation in cloud architecture.'
  }
  if (lower.includes('wireless tls')) {
    return 'WTLS was designed to secure wireless application traffic before modern TLS became dominant.'
  }
  return ''
}

function acronymSecurityContext(fullName) {
  const lower = fullName.toLowerCase()
  if (lower.includes('certificate authority')) {
    return 'issues and signs digital certificates that bind identities to public keys.'
  }
  if (lower.includes('protocol')) {
    return 'is a protocol used in network communication and security architecture.'
  }
  if (lower.includes('encryption') || lower.includes('cipher')) {
    return 'relates to cryptography used to protect confidentiality or integrity.'
  }
  if (lower.includes('intrusion') || lower.includes('detection') || lower.includes('prevention')) {
    return 'relates to detecting or blocking malicious activity on networks or hosts.'
  }
  if (lower.includes('authentication header')) {
    return 'provides integrity and authentication for IPsec traffic but does not encrypt packet contents.'
  }
  if (lower.includes('authentication') || lower.includes('access control')) {
    return 'supports identity verification, authorization, or access management.'
  }
  if (lower.includes('officer') || lower.includes('chief')) {
    return 'is a leadership role involved in security or technology governance.'
  }
  if (lower.includes('firewall') || lower.includes('gateway')) {
    return 'is part of perimeter or network security design.'
  }
  if (lower.includes('hash') || lower.includes('integrity')) {
    return 'supports integrity verification or cryptographic operations.'
  }
  if (lower.includes('virtual') || lower.includes('private network')) {
    return 'helps secure remote or tunneled network communication.'
  }
  if (lower.includes('wireless') || lower.includes('wi-fi') || lower.includes('access point')) {
    return 'is used in wireless networking and Wi-Fi security scenarios.'
  }
  if (lower.includes('officer') || lower.includes('chief') || lower.includes('administrator')) {
    return 'is a role responsible for security, technology, or data governance decisions.'
  }
  if (lower.includes('team') || lower.includes('response')) {
    return 'is an organization or team involved in security incident handling or coordination.'
  }
  if (lower.includes('request') || lower.includes('report')) {
    return 'is a document or message used in security, compliance, or certificate workflows.'
  }
  if (lower.includes('shell') || lower.includes('command')) {
    return 'is a tool or interface used to run commands on a system.'
  }
  if (lower.includes('artificial intelligence') || lower === 'ai') {
    return 'assists security teams with automation, anomaly detection, and pattern analysis.'
  }
  if (lower.includes('intelligence') || lower.includes('sharing')) {
    return 'supports threat detection, analysis, or information sharing between organizations.'
  }
  if (lower.includes('antivirus') || lower.includes('malware')) {
    return 'detects, blocks, or removes malicious software on systems.'
  }
  if (lower.includes('turing test') || lower.includes('captcha')) {
    return 'distinguishes human users from automated bots during login or form submission.'
  }
  if (lower.includes('content management')) {
    return 'publishes and manages web content, requiring patching and access control.'
  }
  if (lower.includes('contingency') || lower.includes('planning')) {
    return 'documents how the organization continues operations during disruptions.'
  }
  if (lower.includes('emergency response')) {
    return 'coordinates response to security incidents and vulnerabilities.'
  }
  if (lower.includes('database')) {
    return 'manages data storage systems that require access control and auditing.'
  }
  if (lower.includes('execution prevention') || lower.includes('data execution')) {
    return 'marks memory regions non-executable to block certain exploit techniques.'
  }
  if (lower.includes('link library') || lower.includes('dynamic link')) {
    return 'is a shared code library that malware may hijack or replace.'
  }
  if (lower.includes('privacy officer') || lower.includes('data privacy')) {
    return 'oversees compliance with data protection laws and privacy policies.'
  }
  if (lower.includes('bridge protocol') || lower.includes('data unit')) {
    return 'is used in network switching; BPDU guard protects against rogue switches.'
  }
  if (lower.includes('redundancy check') || lower.includes('cyclical redundancy')) {
    return 'detects accidental data corruption during transmission or storage.'
  }
  if (lower.includes('signing request')) {
    return 'is submitted to a certificate authority to obtain a signed digital certificate.'
  }
  if (lower.includes('service unit') || lower.includes('channel service')) {
    return 'is telecommunications equipment connecting LANs to WAN carrier lines.'
  }
  if (lower.includes('choose your own') || lower.includes('bring your own')) {
    return 'describes a device ownership model affecting mobile security policy.'
  }
  if (lower.includes('input/output system') || lower.includes('bios')) {
    return 'is firmware that initializes hardware; secure boot protects its integrity.'
  }
  if (lower.includes('gateway protocol') || lower.includes('border gateway')) {
    return 'routes traffic between autonomous systems on the internet.'
  }
  if (lower.includes('shell')) {
    return 'is a command-line interface used to execute system commands.'
  }
  if (lower.includes('adversarial tactics') || lower.includes('attack')) {
    return 'catalogs attacker techniques used for threat modeling and detection.'
  }
  if (lower.includes('corrective action')) {
    return 'documents remediation steps after an audit finding or incident.'
  }
  if (lower.includes('feedback') || lower.includes('chaining') || lower.includes('counter mode')) {
    return 'is a block cipher mode used in symmetric encryption implementations.'
  }
  if (lower.includes('diffie-hellman') || lower.includes('ephemeral')) {
    return 'enables secure key exchange for encrypted sessions.'
  }
  if (lower.includes('identified mail') || lower.includes('domainkeys')) {
    return 'adds digital signatures to email to verify sender authenticity.'
  }
  if (lower.includes('message authentication') || lower.includes('conformance')) {
    return 'defines how receivers handle email that fails SPF or DKIM checks.'
  }
  if (lower.includes('address translation')) {
    return 'remaps IP addresses for routing between networks.'
  }
  if (lower.includes('denial of service')) {
    return 'floods a target with traffic to exhaust resources and deny availability.'
  }
  if (lower.includes('management information') || lower.includes('simple network')) {
    return 'monitors and manages network device health and configuration.'
  }
  if (lower.includes('file transfer') || lower.includes('trivial file')) {
    return 'transfers files over the network and should be replaced with SFTP or SSH.'
  }
  if (lower.includes('hypertext') || lower.includes('transport')) {
    return 'carries web traffic; HTTPS adds TLS encryption on top of HTTP.'
  }
  if (lower.includes('internet protocol') || lower.includes('transmission control')) {
    return 'is a core networking protocol in the TCP/IP stack.'
  }
  if (lower.includes('local area') || lower.includes('wide area')) {
    return 'describes network scope and affects segmentation and security boundaries.'
  }
  if (lower.includes('media access')) {
    return 'governs how devices share physical network media at Layer 2.'
  }
  if (lower.includes('network address') || lower.includes('subnet')) {
    return 'identifies hosts and network segments for routing and access control.'
  }
  if (lower.includes('post office') || lower.includes('simple mail')) {
    return 'sends email; should be secured with TLS and strong authentication.'
  }
  if (lower.includes('secure shell') || lower.includes('secure file')) {
    return 'provides encrypted remote administration and file transfer.'
  }
  if (lower.includes('user datagram')) {
    return 'is a connectionless transport protocol used by DNS, DHCP, and SNMP.'
  }
  if (lower.includes('virtual private')) {
    return 'creates encrypted tunnels for secure remote network access.'
  }
  if (lower.includes('wireless')) {
    return 'relates to Wi-Fi standards, encryption, and rogue AP detection.'
  }
  if (lower.includes('extensible') || lower.includes('markup')) {
    return 'structures data in tagged format used by SAML and configuration files.'
  }
  if (lower.includes('software') || lower.includes('hardware')) {
    return 'describes a technology component relevant to security architecture.'
  }
  return `relates to ${fullName.toLowerCase()} in security or IT operations.`
}

function practicalSecondSentence(term, core, memorize, examples) {
  if (examples) {
    const list = examples.replace(/;\s*/g, ', ').replace(/\s+or\s+/gi, ', ')
    return ensureSentence(`Common examples include ${list}.`)
  }

  const combined = `${term} ${core} ${memorize}`.toLowerCase()
  if (/\budp\b|\btcp\b|\bport \d|\bports \d/.test(combined)) {
    return ensureSentence('Know the protocol and port numbers when this appears on the exam.')
  }

  return ''
}

function buildFirstSentence(term, core) {
  const trimmed = core.replace(/\.$/, '').trim()
  const termNorm = normalize(term.split(/\s+/)[0])

  if (normalize(trimmed).includes(termNorm)) {
    return ensureSentence(trimmed)
  }

  if (/^(unnecessary|weak|legacy|bit-for-bit)\b/i.test(trimmed)) {
    let lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
    lower = lower.replace(/\s(increases|reduces|creates|causes|allows|requires|exposes)\b/i, ' that $1')
    const article = /^[aeiou]/i.test(lower) ? 'an' : 'a'
    return ensureSentence(`${term} is ${article} ${lower}`)
  }

  if (/^(complete|full|partial|automated|formal)\b/i.test(trimmed)) {
    const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
    return ensureSentence(`${term} is a ${lower}`)
  }

  if (/\b(categories|risks|types|methods|controls|examples|standards|protocols)\b/i.test(trimmed)) {
    return ensureSentence(`${term} covers ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`)
  }

  if (
    /^(identifies|determines|verifies|provides|uses|monitors|blocks|finds|stops|restores|discourages|encrypts|logs|tracks|captures|compares|supports|grants|requires|separates|limits|reduces|filters|detects|prevents|allows|denies)\b/i.test(
      trimmed,
    )
  ) {
    return ensureSentence(`${term} ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`)
  }

  if (/^[A-Z][A-Za-z]+(\s+[A-Z][A-Za-z]+)+/.test(trimmed)) {
    return ensureSentence(`${term} is the ${trimmed}`)
  }

  if (/^(common|critical|typical|known|hardened|documented|mandatory|recommended)\b/i.test(trimmed)) {
    return ensureSentence(`${term} covers ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`)
  }

  if (/^(same|some|fewer|minimum|maximum|periodic|temporary|remote|local)\b/i.test(trimmed)) {
    return ensureSentence(`${term} involves ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`)
  }

  return ensureSentence(`${term} is ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`)
}

function expandMemorizeExplanation(term, memorize) {
  if (CURATED_EXPLANATIONS[term]) {
    return CURATED_EXPLANATIONS[term]
  }

  const mem = memorize.trim()
  if (/stands for/i.test(mem)) {
    return expandAcronymExplanation(term, mem)
  }

  if (isAcronymTerm(term)) {
    const acronym = buildAcronymExpansionExplanation(term)
    if (acronym) return acronym
  }

  const parenMatch = mem.match(/^(.+?)\s*\(([^)]+)\)\s*\.?$/)
  const examples = parenMatch?.[2]
  let core = (parenMatch ? parenMatch[1] : mem).replace(/\.$/, '').trim()
  const detail = extractMemorizeDetail(mem)
  if (detail && mem.includes(';')) {
    core = mem.split(/;\s*/)[0].replace(/\.$/, '').trim()
  }
  const first = buildFirstSentence(term, core)
  let second = ''
  if (detail) {
    const detailSentence = detail.charAt(0).toUpperCase() + detail.slice(1)
    second = ensureSentence(detailSentence)
  } else {
    second = practicalSecondSentence(term, core, mem, examples)
  }
  if (hasGenericBoilerplate(second)) second = ''
  const merged = dedupeSentences(`${first} ${second}`.trim())
  if (merged && !isWeakExplanation(merged, mem, term)) return merged
  return merged || first
}

function isWeakExplanation(explanation, memorize, term = '') {
  const exp = (explanation || '').trim()
  const mem = (memorize || '').trim()
  if (!exp) return true
  if (normalizeForCompare(exp) === normalizeForCompare(mem)) return true
  if (/should understand in context, not just as an abbreviation/i.test(exp)) return true
  if (hasGenericBoilerplate(exp)) return true
  if (term && acronymMissingFromExplanation(term, exp, mem)) return true
  const sentenceCount = sentences(exp).length
  if (sentenceCount < 2 && exp.length < 90) return true
  if (sentenceCount === 1 && mem && normalizeForCompare(exp).includes(normalizeForCompare(mem.split(/[;—–-]/)[0]))) {
    return true
  }
  return false
}

const CURATED_EXPLANATIONS = {
  Confidentiality:
    'Confidentiality protects information from unauthorized disclosure. Encryption, access controls, and data classification limit who can read sensitive data.',
  Integrity:
    'Integrity ensures data stays accurate and unaltered. Hashing, digital signatures, file integrity monitoring, and change control detect or prevent unauthorized modification.',
  Availability:
    'Availability keeps systems and data reachable when needed. Redundancy, backups, patching, and DDoS mitigation reduce downtime and service interruptions.',
  'Defense in depth':
    'Defense in depth uses multiple independent security layers so one failed control does not expose the entire environment.',
  DLP: 'Data loss prevention monitors data in use, motion, and at rest to block or alert on unauthorized sharing of sensitive information.',
  Authentication:
    'Authentication verifies identity before access is granted. Methods include passwords, MFA, biometrics, and security keys.',
  Authorization:
    'Authorization determines what an authenticated identity is allowed to do. It is enforced after authentication through roles, policies, or permissions.',
  Accounting:
    'Accounting records and reviews user and system activity. Audit logs support investigations, compliance, and non-repudiation.',
  'Audit logs':
    'Audit logs are timestamped records of security-relevant events. They support accountability, incident response, and compliance reviews.',
  Blockchain:
    'Blockchain uses a distributed ledger to create tamper-evident records. It can support integrity and non-repudiation in some security designs.',
  RADIUS:
    'RADIUS provides AAA services for network access. It commonly uses UDP ports 1812 for authentication and 1813 for accounting.',
  'TACACS+':
    'TACACS+ is a Cisco AAA protocol that separates authentication, authorization, and accounting. It encrypts the entire payload and typically uses TCP port 49.',
  Kerberos:
    'Kerberos uses tickets from a Key Distribution Center for mutual authentication. It is common in Windows domain environments.',
  LDAP:
    'LDAP is a directory protocol used to look up users, groups, and device information. It supports centralized identity management.',
  'Gap analysis':
    'Gap analysis compares the current security state to a target baseline. It reveals missing or weak controls that need remediation.',
  'Zero trust':
    'Zero trust assumes no implicit trust inside or outside the network. Every request is verified using least privilege and continuous validation.',
  AAA: 'Authentication, Authorization, and Accounting (AAA) proves identity, enforces permissions, and records activity. RADIUS and TACACS+ are common AAA implementations for network access.',
  IDS: 'Intrusion Detection System (IDS) monitors network or host activity and generates alerts when it detects suspicious patterns. An IDS is usually passive and does not block traffic — it alerts analysts to investigate.',
  IPS: 'Intrusion Prevention System (IPS) monitors traffic inline and can automatically block or drop malicious packets in real time. Because an IPS sits in the traffic path, misconfiguration can disrupt legitimate connections.',
  HIDS: 'Host-based Intrusion Detection System (HIDS) monitors activity on a single endpoint such as logs, files, and processes for signs of compromise. HIDS focuses on one host rather than network-wide traffic.',
  NIDS: 'Network-based Intrusion Detection System (NIDS) monitors network traffic copies (via SPAN/TAP) to detect attacks crossing the network. NIDS analyzes packets without sitting inline in the traffic path.',
  'WIDS/WIPS':
    'Wireless Intrusion Detection/Prevention System (WIDS/WIPS) detects rogue access points, evil twins, and unauthorized wireless activity. WIPS can also contain or block rogue wireless threats automatically.',
  VLAN: 'Virtual Local Area Network (VLAN) logically segments network traffic into separate broadcast domains on shared switches. VLANs limit lateral movement by separating users, servers, or departments.',
  SNMP: 'Simple Network Management Protocol (SNMP) polls and reports device metrics such as CPU, memory, and interface status. Use SNMPv3 for encryption and authentication instead of legacy community strings.',
  Syslog: 'System Logging Protocol (syslog) is a standard for forwarding log messages from devices to a central collector. Centralized syslog feeds SIEM correlation and long-term retention.',
  NetFlow: 'NetFlow summarizes traffic patterns such as source, destination, ports, and volume. It helps detect data exfiltration and unusual communication patterns.',
  PAP: 'Password Authentication Protocol (PAP) sends credentials in plaintext and offers no replay protection. Avoid PAP when CHAP, EAP-TLS, or other stronger methods are available.',
  CHAP: 'Challenge-Handshake Authentication Protocol (CHAP) uses a challenge-response exchange instead of sending the password directly. It is stronger than PAP but weaker than certificate-based EAP methods.',
  EAP: 'Extensible Authentication Protocol (EAP) is a framework for multiple authentication methods used with 802.1X port-based network access. Common methods include EAP-TLS and PEAP.',
  ZTA: 'Zero Trust Architecture (ZTA) requires continuous verification of every user, device, and connection — never trust, always verify. Access is granted per-session based on identity, device health, and least privilege.',
  ZTNA: 'Zero Trust Network Access (ZTNA) grants access to specific applications based on identity and policy instead of giving full network access through a VPN. Users connect through a broker without implicit trust.',
  SASE: 'Secure Access Service Edge (SASE) delivers cloud-based networking and security services including SWG, CASB, firewall, and ZTNA at the network edge. It supports secure remote access without backhauling traffic to a data center.',
  APT: 'Advanced Persistent Threat (APT) is a skilled, long-term attack campaign often sponsored by nation-states or organized groups. APTs maintain covert access, move laterally, and exfiltrate data over extended periods.',
  CVE: 'Common Vulnerabilities and Exposures (CVE) is a public identifier assigned to a known security flaw. CVE IDs let teams track, prioritize, and patch vulnerabilities across tools and vendors.',
  EOL: 'End of Life (EOL) means a vendor no longer provides patches or security updates for a product. Running EOL software leaves systems exposed to unfixable vulnerabilities.',
  'Script kiddie':
    'A script kiddie is an unskilled attacker who uses pre-built tools and exploits written by others. They lack deep expertise but can still cause damage with ready-made malware kits.',
  'Organized crime':
    'Organized crime threat actors are financially motivated groups with resources and coordination. They target payment data, ransomware victims, and fraud opportunities for profit.',
  'Internal actor':
    'An internal actor is someone inside the organization such as an employee or contractor. They already have knowledge of systems and may abuse legitimate access for theft or sabotage.',
  Espionage: 'Espionage threat actors steal secrets for competitive, political, or military advantage. They target intellectual property, government data, and strategic information.',
  Disruption: 'Disruption-motivated attackers aim to interrupt operations through DDoS, sabotage, or hacktivism. Availability and public impact matter more than financial gain.',
  Revenge: 'Revenge-motivated attackers act from personal grievance, often as disgruntled insiders. They may delete data, leak information, or sabotage systems.',
  'Business email compromise':
    'Business email compromise (BEC) impersonates executives or vendors to trick employees into wiring money or sharing data. It relies on social engineering rather than malware.',
  'Cross-site scripting (XSS)':
    'Cross-site scripting (XSS) injects malicious scripts into a web page that execute in a victim\'s browser. Attackers can steal session cookies, redirect users, or deface sites.',
  'Command injection':
    'Command injection passes unsanitized input to the operating system shell, letting attackers run arbitrary commands. Input validation and parameterized APIs prevent this flaw.',
  'Evil twin':
    'An evil twin is a rogue wireless access point that mimics a legitimate SSID to intercept traffic. Users connect thinking it is the real network while the attacker captures credentials.',
  'Secure baseline':
    'A secure baseline is a hardened reference configuration or image used as the standard for deployment. Systems are compared against the baseline to detect unauthorized changes.',
  'Administrative control':
    'Administrative controls are management-directed measures such as policies, training, risk assessments, and procedures. They define how people should behave to reduce security risk.',
  'Technical control':
    'Technical controls use technology to enforce security: firewalls, encryption, MFA, IDS, and access restrictions. They automate protection and detection.',
  'Physical control':
    'Physical controls protect facilities and hardware through locks, guards, CCTV, mantraps, and badge access. They prevent unauthorized physical access to systems and data.',
  'Compensating control':
    'A compensating control provides alternative protection when a primary control cannot be implemented. It must meet the original security objective through a different method.',
  'Preventive control':
    'A preventive control stops security incidents before they occur. Examples include firewalls, MFA, encryption, and access restrictions.',
  'Detective control':
    'A detective control identifies security events after they start but before major damage. Examples include IDS, audit logs, CCTV, and SIEM alerts.',
  'Spear phishing': 'Spear phishing targets specific individuals using personalized messages that appear legitimate. Attackers research victims to increase the chance of success.',
  Whaling: 'Whaling is spear phishing aimed at senior executives or high-value targets. Messages often involve wire transfers, legal matters, or confidential requests.',
  Smishing: 'Smishing is phishing delivered via SMS text message. Links or replies can install malware or steal credentials on mobile devices.',
  'On-path attack':
    'An on-path attack (man-in-the-middle) intercepts communication between two parties to read or alter data. Encryption and certificate validation help prevent interception.',
  'Replay attack':
    'A replay attack retransmits a captured valid authentication or transaction to gain unauthorized access. Nonces, timestamps, and session tokens defeat replays.',
  'Rogue access point':
    'A rogue access point is an unauthorized wireless AP connected to the corporate network. It can bypass perimeter security and give attackers internal access.',
  'Virtual patching':
    'Virtual patching uses WAF or IPS rules to block exploitation of a vulnerability until a real software patch is applied. It is a temporary compensating measure.',
  'System hardening':
    'System hardening removes unnecessary services, closes ports, and applies secure configurations to shrink the attack surface. Hardened systems have fewer exploitable weaknesses.',
  AI: 'Artificial Intelligence (AI) assists security teams with automation, anomaly detection, and pattern analysis in SIEM and threat hunting tools.',
  AV: 'Antivirus (AV) software scans files and processes to detect, quarantine, or remove known malware signatures.',
}

function isFragmentaryExplanation(text) {
  const value = (text || '').trim()
  if (!value) return true
  if (value.length < 25) return true
  if (/^[a-z]/.test(value) && !/^e\.g\./i.test(value)) return true
  if (!/[.!?]$/.test(value) && value.split(/\s+/).length < 12) return true
  if (/^the [a-z]+ (?:property|concept|control|protocol|method)\b/i.test(value)) return true
  if (/fits because the scenario/i.test(value)) return true
  return false
}

function capitalizeExplanation(text) {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}

function loadPdfExplanations() {
  try {
    const scriptPath = path.join(repoRoot, 'scripts', 'export-pdf-explanations.py')
    const docsPath = path.join(repoRoot, 'docs')
    const output = execSync(`python "${scriptPath}" "${docsPath}"`, { encoding: 'utf8' })
    const parsed = JSON.parse(output)
    const map = new Map()
    for (const entry of Object.values(parsed)) {
      map.set(normalize(entry.answer), entry.explanation)
    }
    return map
  } catch {
    return new Map()
  }
}

function findPdfExplanationForTerm(term, pdfMap) {
  const direct = pdfMap.get(normalize(term))
  if (direct) return direct

  const expansion = ACRONYM_EXPANSIONS[term]?.full
  if (expansion) {
    const expNorm = normalize(expansion)
    for (const [key, explanation] of pdfMap) {
      if (key.includes(expNorm) || key.includes(normalize(term))) return explanation
    }
    for (const [key, explanation] of pdfMap) {
      if (explanation.toLowerCase().includes(expansion.toLowerCase())) return explanation
    }
  }

  return null
}

function formatPdfExplanation(explanation, term) {
  const cleaned = stripBoilerplate(cleanExplanation(explanation, term))
  const parts = sentences(cleaned).filter((sentence) => !isFragmentaryExplanation(sentence))
  if (!parts.length) return ''
  return capitalizeExplanation(dedupeSentences(parts.slice(0, 3).join(' ')))
}

function buildRealExplanation(term, memorize, topic, questionExplanation, pdfExplanation) {
  if (isAcronymTerm(term)) {
    const acronym = buildAcronymExpansionExplanation(term)
    if (acronym) return acronym
  }

  if (CURATED_EXPLANATIONS[term]) {
    return ensureAcronymSpelledOut(term, CURATED_EXPLANATIONS[term], memorize)
  }

  if (pdfExplanation) {
    const formatted = formatPdfExplanation(pdfExplanation, term)
    if (formatted && !isWeakExplanation(formatted, memorize, term)) {
      return formatted
    }
  }

  if (questionExplanation) {
    const cleaned = stripBoilerplate(cleanExplanation(questionExplanation, term))
    const parts = sentences(cleaned).filter((sentence) => !isFragmentaryExplanation(sentence))
    if (parts.length >= 1) {
      const merged = dedupeSentences(parts.slice(0, 3).join(' '))
      if (!isFragmentaryExplanation(merged) && !isWeakExplanation(merged, memorize, term)) {
        return capitalizeExplanation(ensureSentence(merged))
      }
    }
  }

  return ensureAcronymSpelledOut(term, expandMemorizeExplanation(term, memorize), memorize)
}

const pdfExplanations = loadPdfExplanations()

const questionExplanations = new Map()
for (const section of questionsData.sections) {
  for (const question of section.questions) {
    const explanation = (question.explanation || '').trim()
    if (!explanation) continue
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
    for (const answer of answers) {
      const key = normalize(answer)
      if (!questionExplanations.has(key)) {
        questionExplanations.set(key, explanation)
      }
    }
  }
}

const MISSING_TERMS = [
  {
    path: 'Authentication, Authorization, and Accounting (AAA)',
    domain: '1.0 General Security Concepts',
    terms: [
      {
        term: 'Identity proofing',
        memorize: 'Verifies that a person is the real-world identity they claim before an account is created.',
        explanation:
          'Identity proofing confirms someone is who they say they are using documents, biometrics, or trusted verification services before credentials are issued.',
      },
      {
        term: 'Attestation',
        memorize: 'A formal declaration that a system, process, or control meets required standards.',
        explanation:
          'Attestation is evidence that requirements are satisfied, such as a signed compliance statement or device health proof during authentication.',
      },
      {
        term: 'Interoperability',
        memorize: 'Different identity systems can exchange authentication and authorization information reliably.',
        explanation:
          'Interoperability lets SSO and federation work across vendors and domains using shared standards like SAML, OAuth, and OIDC.',
      },
    ],
  },
  {
    path: 'Security Controls > Categories',
    domain: '1.0 General Security Concepts',
    terms: [
      {
        term: 'Managerial control',
        memorize: 'Management-directed security measures such as risk assessments, policies, and oversight.',
        explanation:
          'Managerial controls guide how security is governed and supervised. They include risk management, security planning, and executive accountability.',
      },
    ],
  },
  {
    path: 'Deception and disruption technology',
    domain: '1.0 General Security Concepts',
    summary: 'Honeypots and decoys detect or mislead attackers.',
    terms: [
      {
        term: 'Honeypot',
        memorize: 'A decoy system designed to attract and observe attacker activity.',
        explanation:
          'Honeypots look valuable but are isolated and monitored. They help detect intrusions and study attacker behavior without risking production data.',
      },
      {
        term: 'Honeynet',
        memorize: 'A network of honeypots that simulates a realistic environment.',
        explanation:
          'A honeynet expands deception across multiple systems so analysts can observe lateral movement and tool use in a controlled lab.',
      },
      {
        term: 'Honeyfile',
        memorize: 'A fake file planted to detect unauthorized access.',
        explanation:
          'Honeyfiles are bait documents. Opening or copying them generates alerts because legitimate users should not need them.',
      },
      {
        term: 'Honeytoken',
        memorize: 'Fake credential or data token used to detect misuse.',
        explanation:
          'Honeytokens act as tripwires. Any use of the fake username, API key, or record indicates likely malicious activity or policy violation.',
      },
    ],
  },
  {
    path: 'Cryptographic Solutions > Encryption',
    domain: '1.0 General Security Concepts',
    terms: [
      {
        term: 'Open public ledger',
        memorize: 'A distributed record visible to participants and resistant to undetected tampering.',
        explanation:
          'An open public ledger lets participants verify transactions or entries without a single trusted editor. Blockchain is a common implementation.',
      },
      {
        term: 'Secure enclave',
        memorize: 'Protected processor area that isolates keys and sensitive computations from the main OS.',
        explanation:
          'Secure enclaves reduce exposure of cryptographic material even if the operating system is compromised.',
      },
    ],
  },
  {
    path: 'Change Management Processes > Business processes impacting security operation',
    domain: '5.0 Security Program Management and Oversight',
    terms: [
      { term: 'Approval process', memorize: 'Formal review and sign-off before a change is implemented.' },
      { term: 'Backout plan', memorize: 'Steps to reverse a change if it fails or creates risk.' },
      { term: 'Ownership', memorize: 'Assigned accountability for approving, testing, and supporting a change.' },
      { term: 'Stakeholders', memorize: 'People or teams affected by or responsible for a change.' },
    ],
  },
  {
    path: 'Threat actors',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      {
        term: 'Shadow IT',
        memorize: 'Technology deployed or used without official IT approval.',
        explanation:
          'Shadow IT increases risk because unmanaged systems may lack patching, monitoring, backups, or policy enforcement.',
      },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Message-based',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      { term: 'Brand impersonation', memorize: 'Attackers mimic a trusted brand to trick victims.' },
      { term: 'Misinformation/disinformation', memorize: 'False or misleading content used to manipulate decisions or behavior.' },
      { term: 'Impersonation', memorize: 'Pretending to be a trusted person, brand, or service.' },
    ],
  },
  {
    path: 'Malicious Activity > Malware attacks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      { term: 'Bloatware', memorize: 'Unwanted preinstalled or bundled software that expands attack surface.' },
      { term: 'Keylogger', memorize: 'Malware or device that records keystrokes to steal credentials or data.' },
      { term: 'Logic bomb', memorize: 'Malicious code that executes when a specific condition is met.' },
    ],
  },
  {
    path: 'Malicious Activity > Indicators',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      { term: 'Account lockout', memorize: 'Repeated failed logins trigger account disablement.' },
      { term: 'Blocked content', memorize: 'Security controls stop access to known malicious or policy-violating material.' },
      { term: 'Concurrent session usage', memorize: 'Same account active from multiple sessions at once.' },
      { term: 'Resource consumption', memorize: 'Unusual CPU, memory, or bandwidth use may indicate attack activity.' },
      { term: 'Missing logs', memorize: 'Absent expected log entries may suggest tampering or anti-forensics.' },
    ],
  },
  {
    path: 'Vulnerability Management > Vulnerability response and remediation',
    domain: '4.0 Security Operations',
    terms: [
      {
        term: 'Validation of remediation',
        memorize: 'Confirming that a fix actually removed or mitigated the vulnerability.',
        explanation:
          'After patching or mitigation, teams rescan or retest to verify the issue is resolved and no new weakness was introduced.',
      },
      {
        term: 'Vulnerability reporting',
        memorize: 'Documenting findings, severity, owners, and remediation status.',
        explanation:
          'Reporting gives leadership and operations teams visibility into open risk and tracks progress toward closure.',
      },
    ],
  },
  {
    path: 'Enterprise Capabilities > IDS/IPS',
    domain: '4.0 Security Operations',
    terms: [
      {
        term: 'Email security',
        memorize: 'Controls that filter malicious email, enforce TLS, and protect against phishing and spoofing.',
        explanation:
          'Email security includes gateways, SPF/DKIM/DMARC, attachment sandboxing, and user reporting workflows.',
      },
      {
        term: 'UTM',
        memorize: 'Unified Threat Management combines firewall, IPS, AV, and other protections in one appliance.',
        explanation:
          'UTM devices consolidate several perimeter controls for smaller environments, though they can become a single point of failure.',
      },
    ],
  },
  {
    path: 'Security Awareness > Execution',
    domain: '5.0 Security Program Management and Oversight',
    terms: [
      {
        term: 'Development',
        memorize: 'Designing and updating awareness content, campaigns, and role-based training.',
        explanation:
          'Development is the planning stage of an awareness program: choosing topics, formats, audiences, and success measures before delivery.',
      },
    ],
  },
  {
    path: 'Risk Management > Risk assessment',
    domain: '5.0 Security Program Management and Oversight',
    terms: [
      {
        term: 'Due diligence',
        memorize: 'Reasonable investigation to identify and reduce risk before committing to a decision.',
        explanation:
          'Due diligence appears in vendor selection, mergers, and compliance scenarios where organizations must show they assessed risk responsibly.',
      },
    ],
  },
  {
    path: 'Architecture Models > Architecture and infrastructure concepts',
    domain: '3.0 Security Architecture',
    terms: [
      {
        term: 'Infrastructure as code (IaC)',
        memorize: 'Infrastructure defined and deployed through machine-readable templates.',
        explanation:
          'IaC enables repeatable, auditable environments, but misconfigurations in templates can spread quickly across cloud deployments.',
      },
      {
        term: 'SD-WAN',
        memorize: 'Software-defined WAN that routes traffic across multiple links with centralized policy.',
        explanation:
          'SD-WAN improves resilience and can enforce encrypted transport, but policy mistakes can expose internal resources.',
      },
      {
        term: 'Embedded systems',
        memorize: 'Special-purpose computing built into devices with limited patching and monitoring.',
        explanation:
          'Embedded systems in IoT and ICS often have long lifecycles, making firmware updates and network isolation critical.',
      },
    ],
  },
]

function findTopic(path) {
  return conceptsData.topics.find((topic) => topic.path === path)
}

function addMissingTerms() {
  let added = 0
  for (const group of MISSING_TERMS) {
    let topic = findTopic(group.path)
    if (!topic) {
      topic = {
        id: `topic-${String(conceptsData.topics.length + 1).padStart(3, '0')}`,
        path: group.path,
        domain: group.domain,
        summary: group.summary || `Key concepts from ${group.path}.`,
        terms: [],
      }
      conceptsData.topics.push(topic)
    }

    const existing = new Set(topic.terms.map((term) => normalize(term.term)))
    for (const entry of group.terms) {
      if (existing.has(normalize(entry.term))) continue
      topic.terms.push({
        term: entry.term,
        memorize: entry.memorize,
        explanation: entry.explanation || expandMemorizeExplanation(entry.term, entry.memorize),
      })
      added += 1
    }
  }
  return added
}

let fixed = 0
let kept = 0

for (const topic of conceptsData.topics) {
  for (const entry of topic.terms) {
    const current = entry.explanation || ''
    const questionExplanation = questionExplanations.get(normalize(entry.term))
    const pdfExplanation =
      pdfExplanations.get(normalize(entry.term)) ||
      findPdfExplanationForTerm(entry.term, pdfExplanations)

    const stripped = stripBoilerplate(current)
    if (stripped !== current && !isWeakExplanation(stripped, entry.memorize, entry.term)) {
      entry.explanation = ensureAcronymSpelledOut(entry.term, stripped, entry.memorize)
      fixed += 1
      continue
    }

    if (
      CURATED_EXPLANATIONS[entry.term] ||
      isBoilerplateExplanation(current) ||
      isFragmentaryExplanation(current) ||
      isWeakExplanation(current, entry.memorize, entry.term) ||
      acronymMissingFromExplanation(entry.term, current, entry.memorize) ||
      /\bis an? [^.]+\s+(increases|reduces)\b/i.test(current) ||
      /\bis an? [^.]+\s+(categories|risks)\b/i.test(current)
    ) {
      entry.explanation = buildRealExplanation(
        entry.term,
        entry.memorize || current,
        topic,
        questionExplanation,
        pdfExplanation,
      )
      fixed += 1
      continue
    }

    const cleaned = stripBoilerplate(current)
    if (cleaned !== current) {
      entry.explanation = cleaned
      fixed += 1
    } else {
      kept += 1
    }

    if (isAcronymTerm(entry.term)) {
      const spelled = ensureAcronymSpelledOut(entry.term, entry.explanation, entry.memorize)
      if (spelled !== entry.explanation) {
        entry.explanation = spelled
        fixed += 1
      }
    }
  }
}

const addedTerms = addMissingTerms()
conceptsData.topicCount = conceptsData.topics.length
conceptsData.termCount = conceptsData.topics.reduce((sum, topic) => sum + topic.terms.length, 0)
conceptsData.description =
  'Expanded Security+ SY0-701 study concepts with real explanations sourced from exam objectives, scenarios, and practice materials.'

fs.writeFileSync('public/concepts.json', `${JSON.stringify(conceptsData, null, 2)}\n`)

const remainingBoilerplate = conceptsData.topics
  .flatMap((topic) => topic.terms)
  .filter((entry) => isBoilerplateExplanation(entry.explanation))

const remainingWeak = conceptsData.topics
  .flatMap((topic) => topic.terms)
  .filter((entry) => isWeakExplanation(entry.explanation, entry.memorize, entry.term))

console.log(
  JSON.stringify(
    {
      fixedExplanations: fixed,
      keptGoodExplanations: kept,
      addedTerms,
      topicCount: conceptsData.topicCount,
      termCount: conceptsData.termCount,
      remainingBoilerplate: remainingBoilerplate.length,
      remainingWeak: remainingWeak.length,
      samples: {
        weak: remainingWeak.slice(0, 8).map((entry) => ({
          term: entry.term,
          explanation: entry.explanation?.slice(0, 120),
        })),
      },
    },
    null,
    2,
  ),
)
