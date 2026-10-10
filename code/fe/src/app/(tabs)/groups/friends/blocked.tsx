import { Redirect } from 'expo-router';

export default function BlockedPeopleRedirect() {
  return <Redirect href="/account/blocked-people" />;
}
