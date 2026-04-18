import { useEffect, useState } from "react";
import { getEntityConfig } from "../../config/entities";
import type { EntityKey, EntityPayload, SelectOption } from "../../types/entities";
import { Modal } from "../common/Modal";

interface EntityFormModalProps {
  entityKey: EntityKey;
  isOpen: boolean;
  initialValues: EntityPayload;
  title: string;
  submitLabel: string;
  selectOptions?: Record<string, SelectOption[]>;
  onClose: () => void;
  onSubmit: (values: EntityPayload) => Promise<void>;
}

type FormState = Record<string, string>;

function toFormState(entityKey: EntityKey, initialValues: EntityPayload) {
  const config = getEntityConfig(entityKey);

  return config.fields.reduce<FormState>((accumulator, field) => {
    const value = initialValues[field.key];
    accumulator[field.key] = value === null || value === undefined ? "" : String(value);
    return accumulator;
  }, {});
}

export function EntityFormModal({
  entityKey,
  isOpen,
  initialValues,
  title,
  submitLabel,
  selectOptions,
  onClose,
  onSubmit,
}: EntityFormModalProps) {
  const config = getEntityConfig(entityKey);
  const [formState, setFormState] = useState<FormState>(() => toFormState(entityKey, initialValues));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState(toFormState(entityKey, initialValues));
    setErrorMessage(null);
  }, [entityKey, initialValues, isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const payload: EntityPayload = {};

    for (const field of config.fields) {
      const rawValue = formState[field.key] ?? "";

      if (field.required && rawValue.trim() === "") {
        setErrorMessage(`Completa el campo "${field.label}".`);
        return;
      }

      if (rawValue.trim() === "") {
        payload[field.key] = null;
        continue;
      }

      if (field.valueType === "number" || field.type === "number") {
        const parsedValue = Number(rawValue);

        if (Number.isNaN(parsedValue)) {
          setErrorMessage(`El campo "${field.label}" debe ser numerico.`);
          return;
        }

        payload[field.key] = parsedValue;
        continue;
      }

      payload[field.key] = rawValue;
    }

    setIsSaving(true);

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title={title}>
      <form className="entity-form" onSubmit={handleSubmit}>
        {config.fields
          .filter((field) => !field.hidden)
          .map((field) => {
            const commonProps = {
              id: field.key,
              name: field.key,
              value: formState[field.key] ?? "",
              onChange: (
                event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
              ) => {
                const nextValue = event.target.value;
                setFormState((current) => ({
                  ...current,
                  [field.key]: nextValue,
                }));
              },
            };

            return (
              <label className="form-field" htmlFor={field.key} key={field.key}>
                <span>
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.type === "textarea" ? (
                  <textarea {...commonProps} placeholder={field.placeholder} rows={5} />
                ) : null}
                {field.type === "text" ? (
                  <input {...commonProps} placeholder={field.placeholder} type="text" />
                ) : null}
                {field.type === "number" ? (
                  <input
                    {...commonProps}
                    inputMode="numeric"
                    placeholder={field.placeholder}
                    type="number"
                  />
                ) : null}
                {field.type === "select" ? (
                  <select {...commonProps}>
                    <option value="">Sin seleccionar</option>
                    {(selectOptions?.[field.key] ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {field.helpText ? <small>{field.helpText}</small> : null}
              </label>
            );
          })}

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="button button-primary" disabled={isSaving} type="submit">
            {isSaving ? "Guardando..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
