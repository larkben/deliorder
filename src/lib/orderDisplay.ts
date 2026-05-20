export type SelectionValue = string | string[];

export type DisplaySelection = {
    label: string;
    value: string;
};

export function cleanSelectionLabel(label: string) {
    return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(label) ? "" : label;
}

export function formatSelectionValues(selections: Record<string, SelectionValue> = {}) {
    return Object.entries(selections).flatMap(([label, value]) => {
        const cleanLabel = cleanSelectionLabel(label);

        if (typeof value === "string" && value) {
            return [
                {
                    label: cleanLabel,
                    value,
                },
            ];
        }

        if (Array.isArray(value)) {
            return value.filter(Boolean).map((option) => ({
                label: cleanLabel,
                value: option,
            }));
        }

        return [];
    });
}

export function formatDisplaySelections(
    displaySelections: DisplaySelection[] | undefined,
    selections: Record<string, SelectionValue> = {},
) {
    const display = displaySelections?.filter((selection) => selection.value) ?? [];

    if (display.length > 0) {
        return display;
    }

    return formatSelectionValues(selections);
}

export function selectionText(selection: DisplaySelection) {
    return selection.label ? `${selection.label}: ${selection.value}` : selection.value;
}
