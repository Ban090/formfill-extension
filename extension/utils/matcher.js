const Matcher = (() => {
  // Common job-application field synonyms — each group normalizes to the canonical first entry
  const SYNONYM_GROUPS = [
    ['first_name', 'given_name', 'firstname', 'forename'],
    ['last_name', 'family_name', 'lastname', 'surname'],
    ['email', 'email_address', 'work_email', 'personal_email', 'e_mail'],
    ['phone', 'phone_number', 'contact_number', 'mobile', 'telephone', 'cell'],
    ['linkedin', 'linkedin_url', 'linkedin_profile', 'linkedin_link'],
    ['years_of_experience', 'years_experience', 'experience', 'experience_level', 'years_of_exp', 'exp_level'],
    ['work_authorization', 'work_auth', 'authorized_to_work', 'us_work_authorization'],
    ['cover_letter', 'cover_letter_text', 'why_are_you_interested', 'message'],
    ['salary_expectation', 'expected_salary', 'desired_salary', 'compensation'],
    ['start_date', 'available_start_date', 'earliest_start_date', 'when_can_you_start'],
    ['city', 'current_city', 'location_city'],
    ['state', 'current_state', 'province'],
    ['zip_code', 'postal_code', 'zip'],
    ['country', 'current_country', 'country_of_residence'],
    ['github', 'github_url', 'github_profile', 'github_link'],
    ['portfolio', 'portfolio_url', 'personal_website', 'website'],
    ['highest_education', 'degree', 'education_level', 'highest_degree'],
    ['university', 'college', 'school', 'institution'],
    ['major', 'field_of_study', 'degree_major'],
    ['graduation_year', 'year_of_graduation', 'grad_year'],
    ['race_ethnicity', 'ethnicity', 'race'],
    ['gender', 'gender_identity'],
    ['disability_status', 'disability'],
    ['veteran_status', 'veteran', 'military_service'],
  ];

  // Build canonical map: any synonym → canonical key
  const CANONICAL = new Map();
  for (const group of SYNONYM_GROUPS) {
    const canon = group[0];
    for (const syn of group) {
      CANONICAL.set(syn, canon);
    }
  }

  function canonicalize(key) {
    return CANONICAL.get(key) || key;
  }

  // Jaccard similarity on word sets
  function similarity(a, b) {
    const setA = new Set(a.split('_').filter(Boolean));
    const setB = new Set(b.split('_').filter(Boolean));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // Find best match from stored keys for a given field key.
  // Returns { key, score } or null if below threshold.
  function findBestMatch(fieldKey, storedKeys, threshold = 0.35) {
    const canonField = canonicalize(fieldKey);

    let best = null;
    let bestScore = threshold;

    for (const stored of storedKeys) {
      const canonStored = canonicalize(stored);

      // Synonym hit — treat as exact
      if (canonField === canonStored && canonField !== fieldKey) {
        return { key: stored, score: 1.0 };
      }

      const score = similarity(canonField, canonStored);
      if (score > bestScore) {
        bestScore = score;
        best = { key: stored, score };
      }
    }
    return best;
  }

  return { similarity, findBestMatch, canonicalize };
})();
