INSERT INTO services VALUES
 ('coloracao','Coloração',120,21000),
 ('mechas-loiros','Mechas e loiros',240,39000),
 ('morena-iluminada','Morena iluminada',180,32000),
 ('corte','Corte',60,9000),
 ('tratamento','Tratamento capilar',60,11500),
 ('retoque-raiz','Retoque de raiz',90,16000),
 ('mega-hair','Avaliação de Mega Hair',30,5000),
 ('penteado','Penteado',90,16000),
 ('maquiagem','Maquiagem',60,15000);
INSERT INTO professionals VALUES
 ('lia','Lia Monteiro'), ('nina','Nina Prado'), ('bela','Bela Torres');
INSERT INTO professional_services VALUES
 ('lia','corte'), ('lia','tratamento'), ('lia','coloracao'), ('lia','morena-iluminada'),
 ('nina','corte'), ('nina','tratamento'), ('nina','mechas-loiros'), ('nina','retoque-raiz'), ('nina','mega-hair'),
 ('bela','penteado'), ('bela','maquiagem');
INSERT INTO working_hours
SELECT p.id, d.day, 540, 720 FROM professionals p CROSS JOIN
 (SELECT 2 AS day UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d;
INSERT INTO working_hours
SELECT p.id, d.day, 780, 1080 FROM professionals p CROSS JOIN
 (SELECT 2 AS day UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d;
