import { useTrialDays } from '@/hooks/useTrialDays';

export default function TrialDays() {
  return <>{useTrialDays()}</>;
}