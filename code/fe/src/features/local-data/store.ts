import { Directory, File, Paths } from 'expo-file-system';

const VERSION = 1;

type StoredValue<T> = {
  version: number;
  value: T;
};

function userDirectory(userId: string) {
  return new Directory(Paths.document, 'hissab', encodeURIComponent(userId));
}

function fileFor(userId: string, key: string) {
  return new File(userDirectory(userId), `${encodeURIComponent(key)}.json`);
}

export async function readLocalValue<T>(userId: string, key: string) {
  try {
    const file = fileFor(userId, key);
    if (!file.exists) return null;
    const stored = (await file.json()) as StoredValue<T>;
    return stored?.version === VERSION ? stored.value : null;
  } catch {
    return null;
  }
}

export function writeLocalValue<T>(userId: string, key: string, value: T) {
  try {
    const directory = userDirectory(userId);
    directory.create({ idempotent: true, intermediates: true });
    const file = fileFor(userId, key);
    file.create({ overwrite: true, intermediates: true });
    file.write(
      JSON.stringify({ version: VERSION, value } satisfies StoredValue<T>)
    );
  } catch {
    // Local recovery data is optional; a full disk must not block the app.
  }
}

export function removeLocalValue(userId: string, key: string) {
  try {
    const file = fileFor(userId, key);
    if (file.exists) file.delete();
  } catch {
    // Local recovery data is optional.
  }
}

export function clearLocalUserData(userId: string) {
  try {
    const directory = userDirectory(userId);
    if (directory.exists) directory.delete();
  } catch {
    // Local recovery data is optional.
  }
}
