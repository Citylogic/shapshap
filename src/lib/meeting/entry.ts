import { parseName } from '../name';

/**
 * First-visit gate for `/m/[id]`. Show the entry modal when this device has
 * no claim, or the restored claim has no usable name.
 */
export function needsEntry(hasClaim: boolean, name: string): boolean {
	if (!hasClaim) return true;
	return !parseName(name).ok;
}
