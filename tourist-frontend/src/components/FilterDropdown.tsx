import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { DropdownProps, ActiveFilters } from '../types';

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -8,
    scale: 0.98
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

const overlayVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

const sheetVariants = {
  hidden: {
    y: '100%',
  },
  visible: {
    y: '0%',
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    y: '100%',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

const FilterDropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  categories = [],
  activeFilters = {},
  presentation = 'dropdown'
}) => {
  const [selectedFilters, setSelectedFilters] = useState<ActiveFilters>(activeFilters);

  const sanitizeFiltersByCategoryScope = useCallback((filters: ActiveFilters): ActiveFilters => {
    const selectedDestinationCategories = (filters.destinationCategory || [])
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const visibleCategoryKeys = new Set(
      categories
        .filter((category) => {
          if (category.key === 'destinationCategory') {
            return true;
          }

          const appliesTo = category.appliesToCategories || [];
          if (selectedDestinationCategories.length === 0 || appliesTo.length === 0) {
            return true;
          }

          return appliesTo.some((destinationCategory) => selectedDestinationCategories.includes(destinationCategory));
        })
        .map((category) => category.key)
    );

    const nextFilters: ActiveFilters = {};

    for (const category of categories) {
      if (!visibleCategoryKeys.has(category.key)) {
        continue;
      }

      const selectedValues = filters[category.key] || [];
      if (selectedValues.length === 0) {
        continue;
      }

      const allowedValues = new Set(category.options.map((option) => option.value));
      const validValues = selectedValues.filter((value) => allowedValues.has(value));
      if (validValues.length > 0) {
        nextFilters[category.key] = validValues;
      }
    }

    return nextFilters;
  }, [categories]);

  const visibleCategories = useMemo(() => {
    const selectedDestinationCategories = (selectedFilters.destinationCategory || [])
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    return categories.filter((category) => {
      if (category.key === 'destinationCategory') {
        return true;
      }

      const appliesTo = category.appliesToCategories || [];
      if (selectedDestinationCategories.length === 0 || appliesTo.length === 0) {
        return true;
      }

      return appliesTo.some((destinationCategory) => selectedDestinationCategories.includes(destinationCategory));
    });
  }, [categories, selectedFilters.destinationCategory]);

  useEffect(() => {
    if (isOpen) {
      setSelectedFilters(sanitizeFiltersByCategoryScope(activeFilters));
    }
  }, [activeFilters, isOpen, sanitizeFiltersByCategoryScope]);

  const toggleFilter = (categoryKey: string, optionValue: string): void => {
    setSelectedFilters(prev => {
      const categoryFilters = prev[categoryKey] || [];
      const isSelected = categoryFilters.includes(optionValue);

      const nextFilters: ActiveFilters = {
        ...prev,
        [categoryKey]: isSelected
          ? categoryFilters.filter(val => val !== optionValue)
          : [...categoryFilters, optionValue]
      };

      return sanitizeFiltersByCategoryScope(nextFilters);
    });
  };

  const clearAllFilters = (): void => {
    setSelectedFilters({});
  };

  const handleApply = (): void => {
    onApplyFilters(sanitizeFiltersByCategoryScope(selectedFilters));
    onClose();
  };

  const getSelectedCount = (): number => {
    return Object.values(selectedFilters).reduce((total, filters) => total + filters.length, 0);
  };

  const content = (
    <>
      <div className="filter-header">
        <h4>Filters</h4>
        <button
          type="button"
          className="filter-clear"
          onClick={clearAllFilters}
        >
          Clear All
        </button>
      </div>

      {visibleCategories.map((category) => (
        <div key={category.key} className="filter-section">
          <h5 className="filter-section-title">{category.title}</h5>
          <div className="filter-options">
            {category.options.map((option) => {
              const isSelected = selectedFilters[category.key]?.includes(option.value) || false;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-option ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleFilter(category.key, option.value)}
                >
                  <span>{option.label}</span>
                  {option.bracketText ? <small className="filter-option-bracket">({option.bracketText})</small> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="filter-apply">
        <button
          type="button"
          className="filter-cancel"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="filter-submit"
          onClick={handleApply}
        >
          Apply {getSelectedCount() > 0 ? `(${getSelectedCount()})` : ''}
        </button>
      </div>
    </>
  );

  const bottomSheet = (
    <motion.div
      className="filter-sheet-overlay"
      variants={overlayVariants as any}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
    >
      <motion.section
        className="filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Destination filters"
        variants={sheetVariants as any}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filter-dropdown filter-dropdown-sheet">
          {content}
        </div>
      </motion.section>
    </motion.div>
  );

  if (presentation === 'bottom-sheet') {
    if (typeof document !== 'undefined') {
      return createPortal(
        <AnimatePresence>
          {isOpen ? bottomSheet : null}
        </AnimatePresence>,
        document.body
      );
    }

    return (
      <AnimatePresence>
        {isOpen ? bottomSheet : null}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="filter-dropdown"
          variants={dropdownVariants as any}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterDropdown;