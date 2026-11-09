-- Actualiza texto institucional: quita «contra incendios» y conserva negrita en el nombre
UPDATE settings
SET value = 'En <strong>SEM Ingeniería</strong> ofrecemos soluciones integrales en ingeniería eléctrica, electrónica y electromecánica en todo el Paraguay. Acompañamos proyectos residenciales, comerciales e industriales con montajes técnicos de calidad, instalaciones especializadas y sistemas de protección.'
WHERE key = 'about_p1';
