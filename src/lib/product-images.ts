const CATEGORY_GRADIENTS: Record<string, { bg: string; accent: string; emoji: string }> = {
  drinks:   { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#764ba2', emoji: '🥤' },
  dairy:    { bg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', accent: '#667eea', emoji: '🥛' },
  bakery:   { bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', accent: '#fda085', emoji: '🍞' },
  food:     { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', accent: '#a8edea', emoji: '🍚' },
  snacks:   { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', accent: '#fcb69f', emoji: '🍿' },
  produce:  { bg: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', accent: '#96fbc4', emoji: '🥬' },
  cleaning: { bg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', accent: '#a1c4fd', emoji: '🧹' },
  personal: { bg: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', accent: '#fbc2eb', emoji: '🧴' },
  meat:     { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', accent: '#ff9a9e', emoji: '🥩' },
  frozen:   { bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', accent: '#8ec5fc', emoji: '🧊' },
  sweets:   { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', accent: '#fa709a', emoji: '🍫' },
  default:  { bg: 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)', accent: '#9e9e9e', emoji: '📦' },
};

export function getCategoryGradient(category: string): { bg: string; accent: string; emoji: string } {
  return CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.default;
}
