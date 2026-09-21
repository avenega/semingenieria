-- Seed contenido actual del sitio SEM Ingeniería
INSERT OR REPLACE INTO settings (key, value) VALUES
  ('site_name', 'SEM Ingeniería'),
  ('hero_tagline', 'Soluciones Integrales con Energía y Prevención'),
  ('about_p1', 'En SEM Ingeniería ofrecemos soluciones integrales en ingeniería eléctrica, electrónica y electromecánica en todo el Paraguay. Acompañamos proyectos residenciales, comerciales e industriales con montajes técnicos de calidad, instalaciones especializadas y sistemas de protección y combate contra incendios.'),
  ('about_p2', 'Trabajamos con responsabilidad técnica, plazos claros y un enfoque en la seguridad de las personas y de las instalaciones, desde el diseño hasta la puesta en marcha.'),
  ('vision', 'Ser una empresa referente en los rubros en los que nos desempeñamos, reconocida por la responsabilidad y la excelencia en cada proyecto.'),
  ('mission', 'Brindar servicios de ingeniería de alta calidad, garantizando seguridad, eficiencia y satisfacción a nuestros clientes.'),
  ('commitment', 'Ejecutar cada obra con ética profesional, cumplimiento normativo y atención cercana, en todo el territorio nacional.'),
  ('pillar_1_title', 'Energía y potencia'),
  ('pillar_1_text', 'Montajes eléctricos de media y baja tensión, tableros y grupos electrógenos para instalaciones confiables.'),
  ('pillar_1_icon', 'fa-bolt'),
  ('pillar_2_title', 'Prevención y seguridad'),
  ('pillar_2_text', 'Sistemas de detección y combate contra incendios, CCTV, control de accesos y protección electrónica.'),
  ('pillar_2_icon', 'fa-fire-extinguisher'),
  ('pillar_3_title', 'Montaje industrial'),
  ('pillar_3_text', 'Instalaciones electromecánicas, metalmecánica y climatización para plantas, comercios e industrias.'),
  ('pillar_3_icon', 'fa-gears'),
  ('contact_phone', '0976 129 559'),
  ('contact_email', 'info@semingenieria.com.py'),
  ('contact_whatsapp', '595976129559'),
  ('contact_hours_week', 'Lunes a Viernes: 07:00 a 17:00 hs.'),
  ('contact_hours_sat', 'Sábados: 08:00 a 12:00 hs.'),
  ('coverage_text', 'Ejecutamos obras, montajes mecánicos y de ingeniería en todo el territorio de la República del Paraguay.'),
  ('curso_intro', 'Frentes de trabajo activos e instalaciones en desarrollo a nivel nacional.'),
  ('fotos_intro', 'Registro visual de montajes industriales, tableros y sistemas contra incendio instalados por nuestro equipo.');

INSERT OR REPLACE INTO services (id, title, icon, items_json, highlight, sort_order) VALUES
  ('srv-elec', 'Ingeniería Eléctrica', 'fa-plug', '["Media y baja tensión","Grupos electrógenos"]', 0, 1),
  ('srv-hvac', 'Climatización', 'fa-snowflake', '["Aire acondicionado industrial y comercial","Sistemas de climatización HVAC"]', 0, 2),
  ('srv-fire', 'Seguridad Contra Incendios', 'fa-fire-extinguisher', '["Sistemas hidráulicos y agentes","Detección de incendios"]', 1, 3),
  ('srv-sec', 'Seguridad Electrónica', 'fa-video', '["Videovigilancia (CCTV)","Control de accesos","Sistemas de intrusión"]', 0, 4),
  ('srv-ind', 'Servicios Industriales', 'fa-industry', '["Cableado estructurado","Montajes industriales","Instalaciones metalmecánicas"]', 0, 5);

INSERT OR REPLACE INTO projects (id, kind, title, subtitle, icon, badge, sort_order) VALUES
  ('cur-1', 'curso', 'Montaje Electromecánico Industrial', 'Fase: Tendido y Canalización de Potencia', 'fa-helmet-safety', 'En Ejecución', 1),
  ('cur-2', 'curso', 'Sistema de Detección y Combate Contra Incendios', 'Fase: Montaje de Red de Hidrantes', 'fa-fire-extinguisher', 'En Ejecución', 2),
  ('ent-1', 'entregada', 'Pioneros del Chaco S.A.', 'Sector agroindustrial', 'fa-wheat-straw', 'Entregada', 1),
  ('ent-2', 'entregada', 'Louis Dreyfus Company (LDC)', 'Operaciones logísticas', 'fa-ship', 'Entregada', 2),
  ('ent-3', 'entregada', 'LHC Mining', 'Infraestructura minera', 'fa-mountain-rocks', 'Entregada', 3),
  ('ent-4', 'entregada', 'Planta Copetrol - San Antonio', 'Sector combustibles', 'fa-gas-pump', 'Entregada', 4),
  ('ent-5', 'entregada', 'Planta Industrial Petropar', 'Sector combustibles', 'fa-building-shield', 'Entregada', 5),
  ('ent-6', 'entregada', 'Grupo Cavallaro', 'Consumo masivo', 'fa-box-open', 'Entregada', 6),
  ('ent-7', 'entregada', 'Shopping Mariscal', 'Sector comercial y retail', 'fa-cart-shopping', 'Entregada', 7),
  ('ent-8', 'entregada', 'Boarding Group', 'Comercial / a medida', 'fa-shirt', 'Entregada', 8),
  ('ent-9', 'entregada', 'Óptica Uno', 'Infraestructura comercial', 'fa-glasses', 'Entregada', 9);

INSERT OR REPLACE INTO gallery (id, title, icon, image_key, sort_order) VALUES
  ('gal-1', 'Montaje Eléctrico en Planta Copetrol', 'fa-industry', NULL, 1),
  ('gal-2', 'Instalación de Tablero de Media Tensión', 'fa-bolt-lightning', NULL, 2),
  ('gal-3', 'Red Hidráulica Contra Incendios', 'fa-fire-extinguisher', NULL, 3),
  ('gal-4', 'Sistemas de climatización industrial', 'fa-snowflake', NULL, 4);
