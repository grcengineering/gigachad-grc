import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { GlobeAltIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/hooks/useTranslation';
import clsx from 'clsx';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons';
  showIcon?: boolean;
  showNativeName?: boolean;
  className?: string;
}

export default function LanguageSelector({
  variant = 'dropdown',
  showIcon = true,
  showNativeName = false,
  className,
}: LanguageSelectorProps) {
  const {
    currentLanguage,
    currentLanguageName,
    currentLanguageNativeName,
    availableLanguages,
    changeLanguage,
  } = useTranslation();

  const displayName = showNativeName ? currentLanguageNativeName : currentLanguageName;

  if (variant === 'buttons') {
    return (
      <div className={clsx('flex gap-2 flex-wrap', className)}>
        {availableLanguages.map((language) => (
          <button
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              currentLanguage === language.code
                ? 'bg-brand-500 text-white'
                : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-200 dark:text-surface-800 dark:hover:bg-surface-600'
            )}
          >
            {showNativeName ? language.nativeName : language.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Menu as="div" className={clsx('relative inline-block text-left', className)}>
      <Menu.Button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-surface-700 dark:text-surface-800 bg-surface-100 dark:bg-surface-200 rounded-md hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors">
        {showIcon && <GlobeAltIcon className="w-4 h-4" />}
        <span>{displayName}</span>
        <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {availableLanguages.map((language) => (
              <Menu.Item key={language.code}>
                {({ active }) => (
                  <button
                    onClick={() => changeLanguage(language.code)}
                    className={clsx(
                      'w-full flex items-center justify-between px-4 py-2 text-sm',
                      active
                        ? 'bg-surface-100 dark:bg-surface-200 text-surface-900 dark:text-surface-900'
                        : 'text-surface-700 dark:text-surface-700',
                      currentLanguage === language.code && 'font-medium'
                    )}
                  >
                    <span>
                      {language.name}
                      {showNativeName && language.name !== language.nativeName && (
                        <span className="text-surface-500 ml-1">({language.nativeName})</span>
                      )}
                    </span>
                    {currentLanguage === language.code && (
                      <CheckIcon className="w-4 h-4 text-brand-500" />
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
