import { sql } from "../config/db.js";

/** GET /api/patients/options -- active master values for controlled inputs. */
export async function getHealthOptions(_req, res) {
  const rows = await sql`
    SELECT option_key, value
    FROM health_option_values
    WHERE active = TRUE
    ORDER BY option_key, sort_order, value
  `;

  const options = rows.reduce((result, row) => {
    result[row.option_key] ||= [];
    result[row.option_key].push(row.value);
    return result;
  }, {});

  return res.status(200).json({ message: "Health options retrieved.", options });
}
