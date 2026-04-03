import { useTranslation } from 'react-i18next';

export function LanguageSwitch() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggle}
      className="text-sm text-gray-500 hover:text-gray-700 font-medium cursor-pointer transition-colors"
      title={i18n.language === 'fr' ? 'Switch to English' : 'Passer en français'}
    >
      {i18n.language === 'fr' ? 'EN' : 'FR'}
    </button>
  );
}
