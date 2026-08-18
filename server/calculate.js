const finite = value => Number.isFinite(Number(value));

export function validateAnswers(config, answers) {
  const errors = {};
  for (const question of config.questions.filter(q => q.active)) {
    const value = answers[question.key];
    if (question.required && (value === undefined || value === null || value === '')) {
      errors[question.key] = 'This answer is required.';
      continue;
    }
    if (question.type === 'number' && value !== undefined) {
      if (!finite(value)) errors[question.key] = 'Enter a valid number.';
      else if (Number(value) < question.min || Number(value) > question.max) errors[question.key] = `Enter a value from ${question.min} to ${question.max}.`;
    }
    if (question.type === 'select' && !question.options.some(option => option.value === value)) errors[question.key] = 'Choose one of the available options.';
  }
  return errors;
}

export function calculateEstimate(config, answers) {
  const errors = validateAnswers(config, answers);
  if (Object.keys(errors).length) return { errors };
  const byKey = new Map(config.questions.map(q => [q.key, q]));
  const answer = key => { const q = byKey.get(key); return q?.active ? answers[key] : q?.inactive_default; };
  const option = key => byKey.get(key)?.options?.find(item => item.value === answer(key));
  const area = Number(answer('roof_area'));
  const materialRate = Number(option('material')?.rate_per_sqft ?? 0);
  const pitchMultiplier = Number(option('pitch')?.multiplier ?? 1);
  const storyMultiplier = Number(option('stories')?.multiplier ?? 1);
  const tearOffRate = Number(option('layers')?.tear_off_per_sqft ?? 0);
  const waste = Number(config.modifiers.waste_factor);
  const permit = Number(config.modifiers.permit_flat_fee);
  const spread = Number(config.modifiers.range_spread_pct) / 100;
  if (![area, materialRate, pitchMultiplier, storyMultiplier, tearOffRate, waste, permit, spread].every(Number.isFinite)) throw new Error('Published configuration contains a non-numeric pricing value.');
  const midpoint = area * (1 + waste) * materialRate * pitchMultiplier * storyMultiplier + area * tearOffRate + permit;
  return { midpoint: Math.round(midpoint), low: Math.round(midpoint * (1 - spread)), high: Math.round(midpoint * (1 + spread)) };
}

export function validateConfig(config) {
  const errors = [];
  if (!config?.business?.name?.trim()) errors.push('Business name is required.');
  if (!Array.isArray(config?.questions) || !config.questions.length) errors.push('At least one question is required.');
  const keys = new Set();
  for (const question of config?.questions || []) {
    if (!question.key || keys.has(question.key)) errors.push(`Question keys must be present and unique (${question.key || 'missing'}).`);
    keys.add(question.key);
    if (!question.label?.trim()) errors.push(`Question ${question.key} needs a label.`);
    if (!['number', 'select'].includes(question.type)) errors.push(`Question ${question.key} has an unsupported type.`);
    if (question.type === 'number' && (!finite(question.min) || !finite(question.max) || Number(question.min) >= Number(question.max))) errors.push(`Question ${question.key} needs valid minimum and maximum values.`);
    if (question.type === 'select') {
      if (!Array.isArray(question.options) || !question.options.length) errors.push(`Question ${question.key} needs at least one option.`);
      for (const option of question.options || []) {
        if (!option.value || !option.label?.trim()) errors.push(`Every option in ${question.key} needs a value and label.`);
        for (const rateKey of ['rate_per_sqft', 'multiplier', 'tear_off_per_sqft']) if (rateKey in option && (!finite(option[rateKey]) || Number(option[rateKey]) < 0)) errors.push(`${question.key}.${option.value} has an invalid ${rateKey}.`);
      }
      if (!question.active && !question.options?.some(option => option.value === question.inactive_default)) errors.push(`Hidden question ${question.key} needs a valid default option.`);
    }
    if (!question.active && question.type === 'number' && (!finite(question.inactive_default) || Number(question.inactive_default) < Number(question.min) || Number(question.inactive_default) > Number(question.max))) errors.push(`Hidden question ${question.key} needs a default within its allowed range.`);
  }
  for (const key of ['waste_factor', 'permit_flat_fee', 'range_spread_pct']) if (!finite(config?.modifiers?.[key]) || Number(config.modifiers[key]) < 0) errors.push(`Modifier ${key} must be a non-negative number.`);
  for (const required of ['roof_area', 'material', 'pitch', 'layers', 'stories']) if (!keys.has(required)) errors.push(`Calculation requires the ${required} question.`);
  return errors;
}
