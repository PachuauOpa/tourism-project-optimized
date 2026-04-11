import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DropdownProps, FilterCategory, ActiveFilters } from '../types';

const filterCategories: FilterCategory[] = [
  {
    key: 'type',
    title: 'Destination Type',
    options: [
      { value: 'nature', label: 'Nature', description: 'Natural landscapes and wildlife' },
      { value: 'culture', label: 'Cultural', description: 'Cultural sites and experiences' },
      { value: 'adventure', label: 'Adventure', description: 'Adventure activities and sports' },
      { value: 'heritage', label: 'Heritage', description: 'Historical heritage sites' },
      { value: 'waterfall', label: 'Waterfall', description: 'Waterfalls and cascades' },
      { value: 'mountain', label: 'Mountain', description: 'Mountain peaks and ranges' },
    ]
  },
  {
    key: 'duration',
    title: 'Travel Time',
    options: [
      { value: 'short', label: 'Under 2h', description: 'Quick trips under 2 hours' },
      { value: 'medium', label: '2-5 hours', description: 'Half day to full day trips' },
      { value: 'long', label: '5+ hours', description: 'Full day trips or longer' },
      { value: 'overnight', label: 'Overnight', description: 'Multi-day experiences' },
    ]
  },
  {
    key: 'difficulty',
    title: 'Difficulty Level',
    options: [
      { value: 'easy', label: 'Easy', description: 'Suitable for everyone' },
      { value: 'moderate', label: 'Moderate', description: 'Some physical fitness required' },
      { value: 'challenging', label: 'Challenging', description: 'Good fitness level needed' },
      { value: 'expert', label: 'Expert Only', description: 'For experienced adventurers' },
    ]
  },
  {
    key: 'season',
    title: 'Best Season',
    options: [
      { value: 'spring', label: 'Spring', description: 'March to May' },
      { value: 'summer', label: 'Summer', description: 'June to August' },
      { value: 'monsoon', label: 'Monsoon', description: 'September to November' },
      { value: 'winter', label: 'Winter', description: 'December to February' },
      { value: 'yearround', label: 'Year Round', description: 'Suitable anytime' },
    ]
  }
];

const dropdownVariants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
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
  categories = filterCategories,
  activeFilters = {},
  presentation = 'dropdown'
}) => {
  const [selectedFilters, setSelectedFilters] = useState<ActiveFilters>(activeFilters);

  useEffect(() => {
    if (isOpen) {
      setSelectedFilters(activeFilters);
    }
  }, [isOpen, activeFilters]);

  const toggleFilter = (categoryKey: string, optionValue: string): void => {
    setSelectedFilters(prev => {
      const categoryFilters = prev[categoryKey] || [];
      const isSelected = categoryFilters.includes(optionValue);

      return {
        ...prev,
        [categoryKey]: isSelected
          ? categoryFilters.filter(val => val !== optionValue)
          : [...categoryFilters, optionValue]
      };
    });
  };

  const clearAllFilters = (): void => {
    setSelectedFilters({});
  };

  const handleApply = (): void => {
    onApplyFilters(selectedFilters);
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

      {categories.map((category) => (
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
                  {option.label}
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

  return (
    <AnimatePresence>
      {isOpen && presentation === 'bottom-sheet' && (
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
      )}

      {isOpen && presentation === 'dropdown' && (
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