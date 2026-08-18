export function toPublicConfig(config) {
  return {
    config_version: config.config_version,
    business: structuredClone(config.business),
    questions: config.questions.filter(question => question.active).map(question => ({
      key: question.key,
      label: question.label,
      type: question.type,
      unit: question.unit,
      required: question.required,
      min: question.min,
      max: question.max,
      active: true,
      ...(question.options ? { options: question.options.map(option => ({ value: option.value, label: option.label })) } : {})
    }))
  };
}
