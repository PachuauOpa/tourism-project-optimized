/**
 * BottomNav is kept as a compatibility shim.
 * The actual navigation (desktop sidebar + mobile bottom nav) is now
 * rendered by AppNav inside the Screen component.
 * Pages importing BottomNav directly no longer need to render it — Screen handles it.
 * This file exists only to prevent import errors during migration.
 */
import React from 'react';

export const BottomNav: React.FC = () => null;
export default BottomNav;
