UPDATE leads l
SET name = n.best_name
FROM (
    SELECT DISTINCT ON (RIGHT(regexp_replace(phone, '\D', '', 'g'), 10))
           RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) AS p,
           name AS best_name
    FROM leads
    WHERE coalesce(trim(name), '') <> ''
    ORDER BY RIGHT(regexp_replace(phone, '\D', '', 'g'), 10), length(trim(name)) DESC, created_at DESC
) n
WHERE RIGHT(regexp_replace(l.phone, '\D', '', 'g'), 10) = n.p
  AND l.name IS DISTINCT FROM n.best_name;