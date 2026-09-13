import { useEffect, useState } from "react";
import { api } from "../../lib/axios";
import { RECORD_TYPES } from "../../config/recordTypes";
import {
  Stethoscope,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageSquare,
  Pill,
  Plus,
  Trash2,
  UserRound,
  Users,
  Pencil,
  X,
  TriangleAlert,
  HeartPulse,
  Thermometer,
  Activity,
  Wind,
  Ruler,
  Scale,
  PersonStanding,
  Droplets,
  Smile,
  CloudSun,
  Apple,
  BriefcaseMedical,
  ShieldPlus,
} from "lucide-react";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

/**
 * Table + form for one clinical record type. It is driven entirely by the
 * shared `RECORD_TYPES` config and renders generic fields without any
 * per-record-type branching.
 */

export function ClinicalRecords({ patientId, type, role, readOnly = false }) {
  const definition = RECORD_TYPES[type];

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [form, setForm] = useState({});
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordDate, setRecordDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState(null);

  const canManage = !readOnly && role === "admin";

  async function load() {
    setLoading(true);

    try {
      const { data } = await api.get(
        `/patients/${patientId}/records/${type}`,
        {
          params: { perPage },
        }
      );

      setRecords(data.records || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, perPage]);

  function resetForm() {
    const blank = {};

    Object.keys(definition.fields).forEach((column) => {
      blank[column] = "";
    });

    setForm(blank);
    setRecordDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setEditingRecord(null);
  }

  function toggleForm() {
    if (showForm) {
      resetForm();
    }

    setShowForm((value) => !value);
  }

  function editRecord(record) {
    const values = {};
    Object.keys(definition.fields).forEach((column) => {
      values[column] = record[column] ?? "";
    });

    setForm(values);
    setRecordDate(String(record[definition.dateField] || "").slice(0, 10));
    setEditingRecord(record);
    setError(null);
    setShowForm(true);
  }

  async function handleSave() {
    setError(null);

    try {
      const payload = { ...form, recordDate };
      const url = editingRecord
        ? `/patients/${patientId}/records/${type}/${editingRecord.record_id}`
        : `/patients/${patientId}/records/${type}`;
      const request = editingRecord ? api.patch : api.post;
      await request(url, payload);

      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Could not save that record."
      );
    }
  }

  async function handleDelete(recordId) {
    if (
      !confirm(
        `Remove this ${definition.singular.toLowerCase()}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/patients/${patientId}/records/${type}/${recordId}`
      );

      load();
    } catch (err) {
      console.error(err);
      alert("Could not delete this record.");
    }
  }

  function getFieldIcon(label, index) {
    const text = label.toLowerCase();

    if (text.includes("family")) {
      return <Users size={17} />;
    }

    if (text.includes("condition") || text.includes("diagnosis")) {
      return <Stethoscope size={17} />;
    }

    if (text.includes("description")) {
      return <FileText size={17} />;
    }

    if (text.includes("date")) {
      return <CalendarDays size={17} />;
    }

    if (text.includes("immunization") || text.includes("vaccination")) {
      return <ShieldPlus size={17} />;
    }

    if (text.includes("status")) {
      return <CheckCircle2 size={17} />;
    }

    if (text.includes("medication") || text.includes("medicine")) {
      return <Pill size={17} />;
    }

    if (text.includes("food")) {
      return <Apple size={17} />;
    }

    if (text.includes("surgery") || text.includes("operation")) {
      return <BriefcaseMedical size={17} />;
    }

    if (text.includes("reaction")) {
      return <TriangleAlert size={17} />;
    }

    if (text.includes("environment") || text.includes("air") || text.includes("weather")) {
      return <CloudSun size={17} />;
    }

    if (text.includes("remark") || text.includes("note")) {
      return <MessageSquare size={17} />;
    }

    if (index === 0) {
      return <Stethoscope size={17} />;
    }

    return <ClipboardList size={17} />;
  }
    function getVitalSignIcon(label) {
  const text = label.toLowerCase();

  if (text.includes("blood pressure")) {
    return <HeartPulse size={21} />;
  }

  if (text.includes("temperature")) {
    return <Thermometer size={21} />;
  }

  if (text.includes("pulse")) {
    return <Activity size={21} />;
  }

  if (text.includes("respiratory")) {
    return <Wind size={21} />;
  }

  if (text.includes("height")) {
    return <Ruler size={21} />;
  }

  if (text.includes("weight")) {
    return <Scale size={21} />;
  }

  if (text.includes("body mass") || text.includes("bmi")) {
    return <PersonStanding size={21} />;
  }

  if (text.includes("oxygen") || text.includes("spo2")) {
    return <Droplets size={21} />;
  }

  if (text.includes("pain")) {
    return <Smile size={21} />;
  }

  return <HeartPulse size={21} />;
}

  function formatValue(value, field) {
    if (value === null || value === undefined || value === "") {
      return "--";
    }

    if (field.type === "select") {
      return field.options?.[value] || value;
    }

    return value;
  }

  function getRecordDate(record) {
    const value = record[definition.dateField];

    if (!value) return "--";

    return new Date(value).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function getCreatedDate(record) {
    const value =
      record.created_at ||
      record.createdAt ||
      record.recorded_at ||
      record.recordedAt;

    if (!value) return null;

    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getRecordedBy(record) {
    return (
      record.created_by_name ||
      record.createdByName ||
      record.recorded_by_name ||
      record.recordedByName ||
      record.created_by ||
      record.recorded_by ||
      null
    );
  }

  function getMidwifeNoteItems(value) {
    if (!value) return ["No notes recorded."];

    const segments = value
      .replace(/\r\n/g, "\n")
      .split(/\n+/)
      .flatMap((chunk) =>
        chunk
          .split(/(?<=[.!?])\s+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
      .filter(Boolean);

    return segments.length > 0 ? segments : ["No notes recorded."];
  }

  const isMidwifeNotes = type === "midwife-notes";

  return (
    <div className="ht-health-assessment">
      {/* HEADER */}
      <div className="ht-health-assessment-header">
        <div>
          <h2>{definition.label}</h2>
        </div>

        <div className="ht-health-assessment-actions">
          <span className="ht-health-count">
            {records.length} total
          </span>

          {canManage && (
            <button
              type="button"
              onClick={toggleForm}
              className="ht-health-add-button"
            >
              {showForm ? (
                <>
                  <X size={16} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={16} />
                  {isMidwifeNotes ? "Add Midwife Note" : "Add New Assessment"}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ADD FORM */}
      {showForm && canManage && (
        <div className="ht-health-form">
          <div className="ht-health-form-title">
            <ClipboardList size={18} />
            <h3>{editingRecord ? `Edit ${definition.singular}` : `New ${definition.singular}`}</h3>
          </div>

          {error && (
            <div className="ht-login-alert ht-login-alert-error">
              {error}
            </div>
          )}

          <div className="ht-health-form-grid">
            {Object.entries(definition.fields).map(
              ([column, field]) => (
                <Field
                  key={column}
                  label={field.label}
                  required={field.required}
                >
                  {field.type === "textarea" ? (
                    <Textarea
                      value={form[column] || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [column]: e.target.value,
                        })
                      }
                    />
                  ) : field.type === "select" ? (
                    <Select
                      value={form[column] || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [column]: e.target.value,
                        })
                      }
                    >
                      <option value="">-- Select --</option>

                      {Object.entries(
                        field.options || {}
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={
                        field.type === "number"
                          ? "number"
                          : "text"
                      }
                      value={form[column] || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [column]: e.target.value,
                        })
                      }
                    />
                  )}
                </Field>
              )
            )}

            <Field label={definition.dateLabel} required>
              <Input
                type="date"
                value={recordDate}
                onChange={(e) =>
                  setRecordDate(e.target.value)
                }
                max={new Date()
                  .toISOString()
                  .slice(0, 10)}
              />
            </Field>
          </div>

          <div className="ht-health-form-buttons">
            <button
              type="button"
              onClick={handleSave}
              className="ht-health-save-button"
            >
              {editingRecord ? "Save Changes" : "Save Assessment"}
            </button>

            <button
              type="button"
              onClick={toggleForm}
              className="ht-health-cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="ht-health-empty">
          <p>Loading health assessments...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="ht-health-empty">
          <div className="ht-health-empty-icon">
            <ClipboardList size={25} />
          </div>

          <h3>{isMidwifeNotes ? "No Midwife Notes" : "No Health Assessment"}</h3>

          <p>
            {isMidwifeNotes
              ? "No midwife notes have been recorded for this patient."
              : "No health assessment has been recorded for this patient."}
          </p>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="ht-health-empty-button"
            >
              <Plus size={16} />
              {isMidwifeNotes ? "Add Midwife Note" : "Add New Assessment"}
            </button>
          )}
        </div>
      ) : isMidwifeNotes ? (
        <>
          <div className="ht-midwife-notes-stack">
            {records.map((record) => (
              <div key={record.record_id} className="ht-midwife-note-card">
                <div className="ht-midwife-card-rail">
                  <div className="ht-midwife-card-icon">
                    <FileText size={22} />
                  </div>
                </div>

                <div className="ht-midwife-card-content">
                  <div className="ht-midwife-meta-grid">
                    <div className="ht-midwife-meta-item">
                      <span>Consultation Date:</span>
                      <strong>{getRecordDate(record)}</strong>
                    </div>

                    <div className="ht-midwife-meta-item">
                      <span>Recorded By:</span>
                      <strong>{getRecordedBy(record) || "Midwife User"}</strong>
                    </div>
                  </div>

                  <div className="ht-midwife-notes-block">
                    <span>Notes:</span>
                    <ul>
                      {getMidwifeNoteItems(record.notes).map((line, index) => (
                        <li key={`${record.record_id}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  {canManage && (
                    <div className="ht-assessment-buttons ht-midwife-notes-actions">
                      <button
                        type="button"
                        className="ht-edit-button"
                        title="Edit midwife note"
                        onClick={() => editRecord(record)}
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="ht-delete-button"
                        onClick={() => handleDelete(record.record_id)}
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {records.length >= perPage && (
            <button
              type="button"
              onClick={() => setPerPage((p) => p + 10)}
              className="ht-show-more"
            >
              Show more
            </button>
          )}
        </>
      ) : type === "vital-signs" ? (
  <>
    {records.map((record) => (
      <div
        key={record.record_id}
        className="ht-vital-record-card"
      >
        <div className="ht-vital-grid">
          {Object.entries(definition.fields).map(
            ([column, field]) => (
              <div
                key={column}
                className="ht-vital-card"
              >
                <div className="ht-vital-icon">
                  {getVitalSignIcon(field.label)}
                </div>

                <div className="ht-vital-content">
                  <div className="ht-vital-label">
                    {field.label}
                  </div>

                  <div className="ht-vital-value">
                    {formatValue(
                      record[column],
                      field
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        <div className="ht-vital-footer">
          <div className="ht-assessment-meta">
            {getCreatedDate(record) && (
              <div>
                <CalendarDays size={14} />
                <span>
                  Recorded on {getCreatedDate(record)}
                </span>
              </div>
            )}

            {getRecordedBy(record) && (
              <div>
                <UserRound size={14} />
                <span>
                  Recorded by {getRecordedBy(record)}
                </span>
              </div>
            )}
          </div>

          {canManage && (
            <div className="ht-assessment-buttons">
              <button
                type="button"
                className="ht-edit-button"
                title="Edit vital signs"
                onClick={() => editRecord(record)}
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                type="button"
                className="ht-delete-button"
                onClick={() =>
                  handleDelete(record.record_id)
                }
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    ))}

    {records.length >= perPage && (
      <button
        type="button"
        onClick={() =>
          setPerPage((p) => p + 10)
        }
        className="ht-show-more"
      >
        Show more
      </button>
    )}
  </>
) : (
  <>
    {records.map((record) => (
      <div
        key={record.record_id}
        className="ht-assessment-card"
      >
        <div className="ht-assessment-details">
          {Object.entries(definition.fields).map(
            ([column, field], index) => (
              <div
                key={column}
                className="ht-assessment-row"
              >
                <div className="ht-assessment-icon">
                  {getFieldIcon(
                    field.label,
                    index
                  )}
                </div>

                <div className="ht-assessment-label">
                  {field.label}
                </div>

                <div className="ht-assessment-colon">
                  :
                </div>

                <div className="ht-assessment-value">
                  {field.type === "select" ? (
                    <span
                      className={
                        field.label
                          .toLowerCase()
                          .includes("status")
                          ? "ht-status-active"
                          : ""
                      }
                    >
                      {formatValue(
                        record[column],
                        field
                      )}
                    </span>
                  ) : (
                    formatValue(
                      record[column],
                      field
                    )
                  )}
                </div>
              </div>
            )
          )}

          <div className="ht-assessment-row">
            <div className="ht-assessment-icon">
              <CalendarDays size={17} />
            </div>

            <div className="ht-assessment-label">
              {definition.dateLabel}
            </div>

            <div className="ht-assessment-colon">
              :
            </div>

            <div className="ht-assessment-value">
              {getRecordDate(record)}
            </div>
          </div>
        </div>

        <div className="ht-assessment-footer">
          <div className="ht-assessment-meta">
            {getCreatedDate(record) && (
              <div>
                <CalendarDays size={14} />
                <span>
                  Recorded on {getCreatedDate(record)}
                </span>
              </div>
            )}

            {getRecordedBy(record) && (
              <div>
                <UserRound size={14} />
                <span>
                  Recorded by {getRecordedBy(record)}
                </span>
              </div>
            )}
          </div>

          {canManage && (
            <div className="ht-assessment-buttons">
              <button
                type="button"
                className="ht-edit-button"
                title="Edit assessment"
                onClick={() => editRecord(record)}
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                type="button"
                className="ht-delete-button"
                onClick={() =>
                  handleDelete(record.record_id)
                }
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    ))}

    {records.length >= perPage && (
      <button
        type="button"
        onClick={() =>
          setPerPage((p) => p + 10)
        }
        className="ht-show-more"
      >
        Show more
      </button>
    )}
  </>
)}

      {/* DESIGN CSS */}

      <style>{`
      .ht-vital-record-card {
       width: 100%;
       padding: 14px;
       border: 1px solid #dfe8e3;
       border-radius: 12px;
       background: #ffffff;
       box-shadow: 0 2px 8px rgba(36, 55, 46, 0.04);
      }

      .ht-vital-grid {
       display: grid;
       grid-template-columns: repeat(3, minmax(0, 1fr));
       gap: 12px;
      }

      .ht-vital-card {
       min-height: 92px;
       display: flex;
       align-items: center;
       gap: 12px;
       padding: 14px;
       border: 1px solid #e1ebe5;
       border-radius: 9px;
       background: #fbfdfc;
       box-sizing: border-box;
      }

      .ht-vital-icon {
       width: 42px;
       height: 42px;
       min-width: 42px;
       display: flex;
       align-items: center;
       justify-content: center;
       border-radius: 50%;
       background: #e5f3eb;
       color: #3f765d;
      }

      .ht-vital-content {
       min-width: 0;
      }

      .ht-vital-label {
       margin-bottom: 5px;
       font-size: 10px;
       font-weight: 700;
       color: #53635b;
      }

      .ht-vital-value {
       font-size: 13px;
       font-weight: 600;
       color: #26352e;
       line-height: 1.4;
      }

      .ht-vital-footer {
       display: flex;
       align-items: center;
       justify-content: space-between;
       gap: 15px;
       margin-top: 14px;
       padding-top: 12px;
       border-top: 1px solid #e8eeeb;
      }
        .ht-health-assessment {
          width: 100%;
          padding: 20px;
          background: white;
          border: 1px solid #dfeae4;
          border-radius: 11px;
          box-sizing: border-box;
        }

        .ht-health-assessment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 4px 2px 16px;
        }

        .ht-health-assessment-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #17211d;
        }

        .ht-health-assessment-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ht-health-count {
          font-size: 12px;
          font-weight: 600;
          color: #64716b;
          white-space: nowrap;
        }

        .ht-health-add-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid #aebdb5;
          border-radius: 7px;
          background: #f9fcfa;
          color: #20312a;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .ht-health-add-button:hover {
          background: #eaf5ef;
          border-color: #8ea99b;
        }

        .ht-health-form {
          margin-bottom: 16px;
          padding: 20px;
          border: 1px solid #dce7e1;
          border-radius: 10px;
          background: #f8fbf9;
        }

        .ht-health-form-title {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
          color: #263a31;
        }

        .ht-health-form-title h3 {
          margin: 0;
          font-size: 15px;
        }

        .ht-health-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .ht-health-form-buttons {
          display: flex;
          gap: 8px;
          margin-top: 18px;
        }

        .ht-health-save-button,
        .ht-health-cancel-button {
          min-height: 38px;
          padding: 0 15px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .ht-health-save-button {
          border: 1px solid #496d5b;
          background: #496d5b;
          color: white;
        }

        .ht-health-cancel-button {
          border: 1px solid #c7d2cc;
          background: white;
          color: #52605a;
        }

        .ht-health-empty {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px solid #e1e9e4;
          border-radius: 10px;
          background: #fbfdfc;
          padding: 30px;
        }

        .ht-health-empty-icon {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          border-radius: 50%;
          background: #e5f1eb;
          color: #557967;
        }

        .ht-health-empty h3 {
          margin: 0 0 5px;
          font-size: 14px;
          color: #26332e;
        }

        .ht-health-empty p {
          margin: 0;
          font-size: 12px;
          color: #7b8580;
        }

        .ht-health-empty-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          padding: 8px 13px;
          border: 0;
          border-radius: 7px;
          background: #496d5b;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .ht-midwife-notes-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          padding: 16px;
          border: 1px solid rgba(12, 79, 70, 0.08);
          border-radius: 14px;
          background: #f2faf5;
          box-shadow: 0 4px 18px rgba(15, 29, 26, 0.04);
          box-sizing: border-box;
          margin-top: 4px;
        }

        .ht-midwife-note-card {
          display: flex;
          width: 100%;
          align-items: stretch;
          overflow: hidden;
          border: 1px solid #dfe8e3;
          border-radius: 12px;
          background: #f6faf7;
          box-shadow: 0 2px 8px rgba(36, 55, 46, 0.04);
          box-sizing: border-box;
        }

        .ht-midwife-card-rail {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          width: 72px;
          min-width: 72px;
          padding-top: 18px;
          background: #dfeee5;
          border-right: 1px solid #d1e5d8;
        }

        .ht-midwife-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          margin-top: 24px;
          border-radius: 12px;
          background: #edf7f0;
          color: #3a7d62;
        }

        .ht-midwife-card-content {
          flex: 1;
          min-width: 0;
          padding: 20px 24px 18px;
        }

        .ht-midwife-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 24px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e3e9e5;
        }

        .ht-midwife-meta-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: #2e3f38;
        }

        .ht-midwife-meta-item span {
          font-weight: 700;
        }

        .ht-midwife-meta-item strong {
          font-weight: 600;
          color: #1d2f29;
        }

        .ht-midwife-notes-block {
          margin-top: 18px;
          font-size: 12px;
          color: #2e3f38;
        }

        .ht-midwife-notes-block span {
          display: inline-block;
          margin-bottom: 10px;
          font-weight: 700;
          color: #24352f;
        }

        .ht-midwife-notes-block ul {
          margin: 0;
          padding-left: 18px;
          padding-right: 8px;
          line-height: 1.7;
        }

        .ht-midwife-notes-block li {
          margin-bottom: 2px;
          color: #1d2d29;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .ht-midwife-notes-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .ht-assessment-card {
          display: flex;
          flex-direction: column;
          width: 100%;
          overflow: hidden;
          border: 1px solid #dfe8e3;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(36, 55, 46, 0.04);
        }

        .ht-assessment-details {
          width: 100%;
          padding: 7px 14px 10px;
        }

        .ht-assessment-row {
          display: grid;
          grid-template-columns: 34px 95px 18px minmax(0, 1fr);
          align-items: center;
          min-height: 48px;
          border-bottom: 1px solid #edf1ef;
          font-size: 12px;
        }

        .ht-assessment-row:last-child {
          border-bottom: none;
        }

        .ht-assessment-icon {
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: #e9f3ed;
          color: #557c67;
        }

        .ht-assessment-label {
          font-weight: 700;
          color: #34423b;
        }

        .ht-assessment-colon {
          color: #8a948f;
          font-weight: 600;
        }

        .ht-assessment-value {
          color: #3e4843;
          line-height: 1.5;
        }

        .ht-status-active {
          color: #4d8264;
          font-weight: 700;
        }

        .ht-assessment-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 14px;
          border-top: 1px solid #e8eeeb;
          background: #fbfcfb;
        }

        .ht-assessment-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #68736e;
          font-size: 10px;
        }

        .ht-assessment-meta > div {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ht-assessment-buttons {
          display: flex;
          gap: 7px;
        }

        .ht-edit-button,
        .ht-delete-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 30px;
          padding: 0 11px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .ht-edit-button {
          border: 1px solid #9eb4a8;
          background: #f8fcfa;
          color: #486657;
        }

        .ht-delete-button {
          border: 1px solid #d9a7a7;
          background: #fffafa;
          color: #ad5b5b;
        }

        .ht-edit-button:hover {
          background: #edf6f0;
        }

        .ht-delete-button:hover {
          background: #fff0f0;
        }

        .ht-show-more {
          display: block;
          margin: 12px auto 0;
          padding: 8px 15px;
          border: 1px solid #cdd9d3;
          border-radius: 7px;
          background: white;
          color: #53645b;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          
          .ht-vital-grid{
            grid-template-columns: 1fr;
          }
          .ht-vital-footer{
            aligns-items: flex-start;
            flex-direction: column;
          }
          .ht-health-assessment-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .ht-health-assessment-actions {
            width: 100%;
            justify-content: space-between;
          }

          .ht-health-form-grid {
            grid-template-columns: 1fr;
          }

          .ht-midwife-note-card {
            flex-direction: column;
          }

          .ht-midwife-card-rail {
            width: 100%;
            min-height: 58px;
            border-right: none;
            border-bottom: 1px solid #d1e5d8;
          }

          .ht-midwife-card-icon {
            margin-top: 0;
          }

          .ht-midwife-meta-grid {
            grid-template-columns: 1fr;
          }

          .ht-assessment-row {
            grid-template-columns: 32px 85px 14px minmax(0, 1fr);
            font-size: 11px;
          }

          .ht-assessment-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .ht-assessment-buttons {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}