import { DialogItem } from '../types';

import daily from '../../assets/conversations/daily.json';
import cafe from '../../assets/conversations/cafe.json';
import business from '../../assets/conversations/business.json';
import restaurant from '../../assets/conversations/restaurant.json';
import shopping from '../../assets/conversations/shopping.json';
import travel from '../../assets/conversations/travel.json';

export const conversationsData: Record<string, { title: string; dialogs: DialogItem[] }> = {
  daily: daily as { title: string; dialogs: DialogItem[] },
  cafe: cafe as { title: string; dialogs: DialogItem[] },
  business: business as { title: string; dialogs: DialogItem[] },
  restaurant: restaurant as { title: string; dialogs: DialogItem[] },
  shopping: shopping as { title: string; dialogs: DialogItem[] },
  travel: travel as { title: string; dialogs: DialogItem[] },
};
