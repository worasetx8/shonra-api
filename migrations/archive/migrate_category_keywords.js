import { executeQuery } from "../../config/database.js";

async function migrate() {
  try {
    console.log("🚀 Starting category_keywords migration...");

    // 0. Check if categories table exists first
    const checkCategories = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'categories'
    `);
    
    const hasCategories = checkCategories.success && checkCategories.data && checkCategories.data[0] &&
      (checkCategories.data[0].count > 0 || checkCategories.data[0].COUNT > 0);
    
    if (!hasCategories) {
      console.log("⚠️  categories table doesn't exist yet. Skipping category_keywords migration.");
      console.log("💡 Hint: migrate_ensure_all_tables.js should run first to create base tables.");
      return;
    }

    // 1. Create category_keywords table
    const createTable = `
      CREATE TABLE IF NOT EXISTS category_keywords (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category_id INT NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        is_high_priority BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE KEY unique_category_keyword (category_id, keyword)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    try {
      await executeQuery(createTable);
      console.log("✅ Created category_keywords table");
    } catch (error) {
      // If table already exists or FK error, that's okay
      if (error.code === 'ER_FK_CANNOT_OPEN_PARENT' || 
          error.message.includes("doesn't exist") ||
          error.message.includes("already exists")) {
        console.log("⏭️  category_keywords table creation skipped (may already exist or categories table missing)");
      } else {
        throw error;
      }
    }

    // 2. Get all active categories
    const categoriesResult = await executeQuery(
      "SELECT id, name FROM categories WHERE is_active = 1"
    );

    if (!categoriesResult.success || !categoriesResult.data || categoriesResult.data.length === 0) {
      console.log("⚠️ No active categories found. Please create categories first.");
      return;
    }

    const categories = categoriesResult.data;
    console.log(`📋 Found ${categories.length} active categories`);

    // 3. Define keywords for each category (from hardcoded values)
    const categoryKeywordsMap = {
      // Electronics
      electronics: {
        keywords: [
          'อิเล็กทรอนิก', 'electronic', 'electronics', 'tech', 'technology', 'คอมพิวเตอร์', 'computer', 'pc', 'laptop', 'notebook', 'tablet', 'แท็บเล็ต', 'ipad', 'มือถือ', 'phone', 'smartphone', 'mobile', 'cell phone', 'iphone', 'android', 'samsung', 'huawei', 'xiaomi', 'oppo', 'vivo', 'realme', 'oneplus', 'nokia', 'sony', 'lg', 'motorola', 'หูฟัง', 'headphone', 'earphone', 'earbud', 'airpods', 'speaker', 'ลำโพง', 'charger', 'ที่ชาร์จ', 'wireless charger', 'cable', 'สาย', 'usb', 'usb cable', 'adapter', 'อะแดปเตอร์', 'hdmi', 'vga', 'monitor', 'จอ', 'screen', 'keyboard', 'คีย์บอร์ด', 'mouse', 'เมาส์', 'webcam', 'กล้องเว็บแคม', 'printer', 'เครื่องพิมพ์', 'scanner', 'สแกนเนอร์', 'router', 'เราเตอร์', 'wifi', 'wireless', 'ไร้สาย', 'bluetooth', 'บลูทูธ', 'ssd', 'hdd', 'hard drive', 'ram', 'memory', 'graphics card', 'การ์ดจอ', 'power supply', 'psu', 'power adapter', 'อะแดปเตอร์ไฟ', 'case', 'เคส', 'phone case', 'screen protector', 'ฟิล์ม', 'film', 'tempered glass', 'power bank', 'powerbank', 'แบตเตอรี่สำรอง', 'battery', 'แบตเตอรี่', 'selfie stick', 'ไม้เซลฟี่', 'tripod', 'ขาตั้ง', 'phone holder', 'ที่วางมือถือ', 'car mount', 'ที่ติดรถ', 'lens', 'เลนส์', 'phone lens', 'กล้อง', 'camera', 'dslr', 'mirrorless', 'action camera', 'กล้องแอคชั่น', 'gopro', 'drone', 'quadcopter', 'memory card', 'การ์ดหน่วยความจำ', 'sd card', 'cf card', 'camera battery', 'แบตเตอรี่กล้อง', 'camera bag', 'กระเป๋ากล้อง', 'camera strap', 'สายกล้อง', 'remote control', 'รีโมทคอนโทรล', 'flash', 'speedlight', 'tripod', 'ขาตั้งกล้อง', 'monopod', 'gimbal', 'stabilizer', 'filter', 'lens cap', 'lens hood', 'cleaning kit', 'sensor cleaner', 'blower', 'brush', 'นาฬิกา', 'watch', 'smartwatch', 'นาฬิกาอัจฉริยะ', 'apple watch', 'samsung watch', 'fitness tracker', 'watch strap', 'สายนาฬิกา', 'watch band', 'watch battery', 'แบตเตอรี่นาฬิกา', 'watch charger', 'ที่ชาร์จนาฬิกา'
        ],
        highPriority: [
          'smartphone', 'iphone', 'android', 'samsung', 'huawei', 'xiaomi',
          'laptop', 'notebook', 'tablet', 'ipad', 'computer', 'pc',
          'headphone', 'earphone', 'airpods', 'speaker', 'ลำโพง',
          'camera', 'dslr', 'mirrorless', 'gopro', 'drone',
          'watch', 'smartwatch', 'apple watch', 'fitness tracker'
        ]
      },
      // Fashion & Accessories
      fashion: {
        keywords: [
          'แฟชั่น', 'fashion', 'เสื้อ', 'shirt', 't-shirt', 'tee', 'เสื้อยืด', 'เสื้อเชิ้ต', 'blouse', 'กางเกง', 'pants', 'trousers', 'jeans', 'ยีนส์', 'shorts', 'กางเกงขาสั้น', 'กระโปรง', 'skirt', 'dress', 'ชุด', 'ชุดกระโปรง', 'รองเท้า', 'shoe', 'sneaker', 'รองเท้าผ้าใบ', 'boot', 'รองเท้าบูท', 'sandal', 'รองเท้าแตะ', 'flip flop', 'heels', 'รองเท้าส้นสูง', 'กระเป๋า', 'bag', 'backpack', 'กระเป๋าเป้', 'handbag', 'กระเป๋าถือ', 'wallet', 'กระเป๋าเงิน', 'purse', 'watch', 'นาฬิกา', 'แว่นตา', 'glasses', 'sunglasses', 'แว่นกันแดด', 'belt', 'เข็มขัด', 'tie', 'เนคไท', 'scarf', 'ผ้าพันคอ', 'hat', 'หมวก', 'cap', 'jewelry', 'เครื่องประดับ', 'necklace', 'สร้อยคอ', 'ring', 'แหวน', 'bracelet', 'กำไล', 'earring', 'ต่างหู', 'accessories', 'accessory', 'อุปกรณ์เสริม', 'clothing', 'apparel', 'เสื้อผ้า', 'เครื่องแต่งกาย'
        ],
        highPriority: [
          'shirt', 'เสื้อ', 'pants', 'กางเกง', 'dress', 'ชุด', 'skirt', 'กระโปรง',
          'shoe', 'รองเท้า', 'sneaker', 'boot', 'sandal',
          'bag', 'กระเป๋า', 'backpack', 'กระเป๋าเป้', 'wallet', 'กระเป๋าเงิน',
          'jewelry', 'เครื่องประดับ', 'necklace', 'สร้อยคอ', 'ring', 'แหวน', 'bracelet', 'กำไล'
        ]
      },
      // Health & Beauty
      beauty: {
        keywords: [
          'ความงาม', 'beauty', 'health', 'สุขภาพ', 'เครื่องสำอาง', 'cosmetic', 'makeup', 'make-up', 'เมคอัพ', 'ลิปสติก', 'lipstick', 'ลิป', 'lip', 'รองพื้น', 'foundation', 'concealer', 'คอนซีลเลอร์', 'มาสคาร่า', 'mascara', 'อายแชโดว์', 'eyeshadow', 'อาย', 'eye', 'บลัช', 'blush', 'highlighter', 'ไฮไลท์', 'bronzer', 'primer', 'ไพรเมอร์', 'setting spray', 'สเปรย์เซ็ต', 'ครีม', 'cream', 'โลชั่น', 'lotion', 'เซรั่ม', 'serum', 'โทนเนอร์', 'toner', 'คลีนเซอร์', 'cleanser', 'สบู่', 'soap', 'แชมพู', 'shampoo', 'ครีมนวด', 'conditioner', 'hair mask', 'มาส์กผม', 'hair oil', 'น้ำมันผม', 'nail polish', 'ยาทาเล็บ', 'nail', 'เล็บ', 'perfume', 'น้ำหอม', 'fragrance', 'deodorant', 'deo', 'sunscreen', 'ครีมกันแดด', 'spf', 'moisturizer', 'มอยส์เจอไรเซอร์', 'exfoliator', 'สครับ', 'scrub', 'mask', 'มาส์ก', 'sheet mask', 'มาส์กแผ่น', 'essence', 'ampoule', 'แอมพูล', 'eye cream', 'ครีมรอบตา', 'lip balm', 'ลิปบาล์ม', 'hand cream', 'ครีมทามือ', 'body lotion', 'โลชั่นทาตัว', 'ผมร่วง', 'ผมบาง', 'หนังศีรษะ', 'ผมหงอก', 'ผมดก', 'ผมดำ', 'มันผม', 'รังแค', 'dandruff', 'คัน', 'itchy', 'scalp', 'ผมแตกปลาย', 'split ends', 'hair loss', 'hair fall', 'hair care', 'hair treatment', 'hair product', 'hair serum', 'hair tonic', 'hair growth', 'ผมยาว', 'thinning hair', 'bald', 'ศีรษะล้าน', 'hair repair', 'hair strengthen', 'hair volume', 'hair density', 'hair shine', 'hair smooth', 'hair soft', 'hair healthy', 'healthy hair', 'hair problem', 'ปัญหาผม', 'hair solution', 'แก้ผม', 'ชะลอ', 'ลด', 'ขจัด', 'ไลโอ', 'lyo', 'skincare', 'skin care', 'ดูแลผิว', 'facial', 'หน้า', 'acne', 'สิว', 'blemish', 'จุดด่างดำ', 'whitening', 'ขาว', 'brightening', 'สว่าง', 'anti-aging', 'ต้านริ้วรอย', 'wrinkle', 'ริ้วรอย', 'vitamin', 'วิตามิน', 'supplement', 'อาหารเสริม', 'collagen', 'คอลลาเจน', 'probiotic', 'probiotic', 'omega', 'omega', 'calcium', 'แคลเซียม', 'iron', 'เหล็ก', 'magnesium', 'แมกนีเซียม', 'zinc', 'สังกะสี', 'vitamin c', 'vitamin c', 'vitamin d', 'vitamin d', 'multivitamin', 'multivitamin', 'thermometer', 'thermometer', 'blood pressure', 'blood pressure', 'scale', 'scale', 'massage', 'massage', 'massager', 'massager', 'tens', 'tens', 'heating pad', 'heating pad', 'ice pack', 'ice pack', 'bandage', 'bandage', 'plaster', 'plaster', 'gauze', 'gauze', 'cotton', 'cotton', 'alcohol', 'alcohol', 'antiseptic', 'antiseptic', 'ointment', 'ointment', 'spray', 'spray', 'inhaler', 'inhaler', 'mask', 'mask', 'surgical mask', 'surgical mask', 'n95', 'n95', 'face mask', 'face mask', 'hand sanitizer', 'hand sanitizer', 'hand wash', 'hand wash', 'tissue', 'tissue', 'wipes', 'wipes', 'baby wipes', 'baby wipes'
        ],
        highPriority: [
          'makeup', 'เมคอัพ', 'lipstick', 'ลิปสติก', 'foundation', 'รองพื้น',
          'shampoo', 'แชมพู', 'conditioner', 'ครีมนวด', 'hair care', 'hair treatment',
          'skincare', 'skin care', 'ดูแลผิว', 'serum', 'เซรั่ม', 'moisturizer', 'มอยส์เจอไรเซอร์',
          'ผมร่วง', 'ผมบาง', 'ผมหงอก', 'รังแค', 'dandruff', 'hair loss', 'hair fall',
          'lyo', 'ไลโอ', 'vitamin', 'วิตามิน', 'supplement', 'อาหารเสริม'
        ]
      },
      // Home & Living
      home: {
        keywords: [
          'บ้าน', 'home', 'living', 'เฟอร์นิเจอร์', 'furniture', 'โต๊ะ', 'table', 'desk', 'โต๊ะทำงาน', 'dining table', 'โต๊ะอาหาร', 'coffee table', 'โต๊ะกาแฟ', 'เก้าอี้', 'chair', 'sofa', 'โซฟา', 'couch', 'armchair', 'เก้าอี้นวม', 'bed', 'เตียง', 'mattress', 'ที่นอน', 'pillow', 'หมอน', 'blanket', 'ผ้าห่ม', 'quilt', 'ผ้านวม', 'bedding', 'ผ้าปูที่นอน', 'bed sheet', 'curtain', 'ม่าน', 'curtains', 'lamp', 'โคมไฟ', 'light', 'ไฟ', 'lighting', 'chandelier', 'โคมระย้า', 'carpet', 'พรม', 'rug', 'mat', 'เสื่อ', 'doormat', 'เสื่อหน้าประตู', 'mirror', 'กระจก', 'picture frame', 'กรอบรูป', 'vase', 'แจกัน', 'decoration', 'ของตกแต่ง', 'plant', 'ต้นไม้', 'pot', 'กระถาง', 'storage', 'ที่เก็บของ', 'shelf', 'ชั้นวาง', 'cabinet', 'ตู้', 'wardrobe', 'ตู้เสื้อผ้า', 'kitchen', 'ครัว', 'cookware', 'เครื่องครัว', 'utensil', 'อุปกรณ์ครัว', 'appliance', 'เครื่องใช้ไฟฟ้า', 'น้ำยาซักผ้า', 'detergent', 'laundry', 'washing', 'ซัก', 'fabric softener', 'น้ำยาปรับผ้านุ่ม', 'bleach', 'น้ำยาซักผ้าขาว', 'stain remover', 'น้ำยาขจัดคราบ', 'washing powder', 'ผงซักฟอก', 'washing liquid', 'น้ำยาซักผ้า', 'dish soap', 'น้ำยาล้างจาน', 'dishwasher', 'เครื่องล้างจาน', 'sponge', 'ฟองน้ำ', 'cleaning', 'ทำความสะอาด', 'cleaning product', 'ผลิตภัณฑ์ทำความสะอาด', 'broom', 'ไม้กวาด', 'mop', 'ไม้ถูพื้น', 'vacuum', 'เครื่องดูดฝุ่น', 'trash bag', 'ถุงขยะ', 'air freshener', 'น้ำหอมปรับอากาศ', 'organizer', 'ที่จัดเก็บ', 'basket', 'ตะกร้า', 'container', 'ภาชนะ', 'box', 'กล่อง', 'drawer', 'ลิ้นชัก', 'hanger', 'ไม้แขวน', 'clothes hanger', 'ไม้แขวนเสื้อ', 'laundry basket', 'ตะกร้าซักผ้า', 'iron', 'เตารีด', 'ironing board', 'กระดานรีดผ้า', 'dryer', 'เครื่องอบผ้า', 'washing machine', 'เครื่องซักผ้า', 'breeze', 'บรีส', 'excel', 'เอกเซล', 'signature', 'ซิกเนเจอร์', 'liquid', 'น้ำยา', 'ซักผ้า', 'laundry detergent', 'fabric', 'ผ้า', 'clothes', 'เสื้อผ้า', 'washing detergent', 'ผงซัก', 'น้ำยาซัก', 'detergent powder', 'detergent liquid'
        ],
        highPriority: [
          'น้ำยาซักผ้า', 'detergent', 'laundry', 'washing', 'ซัก', 'laundry detergent', 'washing detergent', 
          'ผงซักฟอก', 'washing powder', 'washing liquid', 'น้ำยาซัก', 'detergent powder', 'detergent liquid',
          'น้ำยาล้างจาน', 'dish soap', 'dishwasher', 'เครื่องล้างจาน',
          'fabric softener', 'น้ำยาปรับผ้านุ่ม', 'bleach', 'น้ำยาซักผ้าขาว',
          'breeze', 'บรีส', 'excel', 'เอกเซล', 'signature', 'ซิกเนเจอร์',
          'cleaning', 'ทำความสะอาด', 'cleaning product', 'ผลิตภัณฑ์ทำความสะอาด',
          'vacuum', 'เครื่องดูดฝุ่น', 'broom', 'ไม้กวาด', 'mop', 'ไม้ถูพื้น'
        ]
      },
      // Family
      family: {
        keywords: [
          'ครอบครัว', 'family', 'เด็ก', 'baby', 'kid', 'child', 'children', 'ทารก', 'infant', 'toddler', 'ของเล่น', 'toy', 'toys', 'ตุ๊กตา', 'doll', 'action figure', 'ฟิกเกอร์', 'robot', 'หุ่นยนต์', 'car', 'รถ', 'toy car', 'รถของเล่น', 'remote control', 'รีโมทคอนโทรล', 'lego', 'เลโก้', 'block', 'บล็อก', 'puzzle', 'puzzle', 'board game', 'board game', 'card game', 'card game', 'educational', 'การศึกษา', 'learning', 'การเรียนรู้', 'เสื้อผ้าเด็ก', 'baby clothes', 'clothing', 'เสื้อผ้า', 'diaper', 'ผ้าอ้อม', 'diapers', 'formula', 'นมผง', 'baby formula', 'bottle', 'ขวดนม', 'feeding bottle', 'pacifier', 'จุกนม', 'stroller', 'รถเข็น', 'baby stroller', 'รถเข็นเด็ก', 'car seat', 'ที่นั่งรถ', 'high chair', 'เก้าอี้เด็ก', 'crib', 'เปล', 'baby crib', 'เปลเด็ก', 'playpen', 'walker', 'bouncer', 'bath', 'อาบน้ำ', 'baby bath', 'อ่างอาบน้ำ', 'towel', 'ผ้าเช็ดตัว', 'baby towel', 'ผ้าเช็ดตัวเด็ก', 'bib', 'ผ้ากันเปื้อน', 'sippy cup', 'แก้วหัดดื่ม', 'training cup', 'school', 'โรงเรียน', 'stationery', 'เครื่องเขียน', 'book', 'หนังสือ', 'textbook', 'ตำรา', 'notebook', 'สมุด', 'pen', 'ปากกา', 'pencil', 'ดินสอ', 'eraser', 'ยางลบ', 'ruler', 'ไม้บรรทัด', 'backpack', 'กระเป๋าเป้', 'lunch box', 'กล่องข้าว', 'water bottle', 'ขวดน้ำ', 'uniform', 'ชุดนักเรียน', 'shoes', 'รองเท้า', 'socks', 'ถุงเท้า'
        ],
        highPriority: [
          'baby', 'เด็ก', 'infant', 'ทารก', 'diaper', 'ผ้าอ้อม',
          'formula', 'นมผง', 'bottle', 'ขวดนม', 'stroller', 'รถเข็น',
          'toy', 'ของเล่น', 'educational', 'การศึกษา', 'learning', 'การเรียนรู้'
        ]
      },
      // Toys & Pets
      toys: {
        keywords: [
          'ของเล่น', 'toy', 'toys', 'ตุ๊กตา', 'doll', 'action figure', 'ฟิกเกอร์', 'robot', 'หุ่นยนต์', 'car', 'รถ', 'toy car', 'รถของเล่น', 'remote control', 'รีโมทคอนโทรล', 'lego', 'เลโก้', 'block', 'บล็อก', 'puzzle', 'puzzle', 'board game', 'board game', 'card game', 'card game', 'educational', 'การศึกษา', 'learning', 'การเรียนรู้', 'pet', 'pets', 'สัตว์เลี้ยง', 'dog', 'สุนัข', 'cat', 'แมว', 'bird', 'นก', 'fish', 'ปลา', 'hamster', 'แฮมสเตอร์', 'rabbit', 'กระต่าย', 'pet food', 'อาหารสัตว์', 'dog food', 'อาหารสุนัข', 'cat food', 'อาหารแมว', 'bird food', 'อาหารนก', 'fish food', 'อาหารปลา', 'pet toy', 'ของเล่นสัตว์', 'dog toy', 'ของเล่นสุนัข', 'cat toy', 'ของเล่นแมว', 'pet bed', 'ที่นอนสัตว์', 'dog bed', 'ที่นอนสุนัข', 'cat bed', 'ที่นอนแมว', 'pet cage', 'กรงสัตว์', 'bird cage', 'กรงนก', 'fish tank', 'ตู้ปลา', 'aquarium', 'ตู้ปลา', 'pet leash', 'สายจูง', 'dog leash', 'สายจูงสุนัข', 'pet collar', 'ปลอกคอสัตว์', 'dog collar', 'ปลอกคอสุนัข', 'cat collar', 'ปลอกคอแมว', 'pet bowl', 'ชามอาหารสัตว์', 'dog bowl', 'ชามอาหารสุนัข', 'cat bowl', 'ชามอาหารแมว', 'pet carrier', 'กระเป๋าใส่สัตว์', 'pet grooming', 'ดูแลสัตว์', 'pet shampoo', 'แชมพูสัตว์', 'dog shampoo', 'แชมพูสุนัข', 'cat shampoo', 'แชมพูแมว', 'pet brush', 'แปรงสัตว์', 'dog brush', 'แปรงสุนัข', 'cat brush', 'แปรงแมว', 'pet litter', 'ทรายแมว', 'cat litter', 'ทรายแมว', 'pet medicine', 'ยาสัตว์', 'vaccine', 'วัคซีน', 'pet health', 'สุขภาพสัตว์'
        ],
        highPriority: [
          'toy', 'ของเล่น', 'doll', 'ตุ๊กตา', 'lego', 'เลโก้', 'puzzle',
          'pet', 'สัตว์เลี้ยง', 'dog', 'สุนัข', 'cat', 'แมว', 'pet food', 'อาหารสัตว์'
        ]
      }
    };

    // 4. Insert keywords for each category
    let totalInserted = 0;
    for (const category of categories) {
      const catNameLower = category.name.toLowerCase();
      let keywordsData = null;

      // Match category to keywords map
      if (catNameLower.includes('อิเล็กทรอนิก') || catNameLower.includes('electronic') || catNameLower.includes('tech') || catNameLower.includes('คอมพิวเตอร์')) {
        keywordsData = categoryKeywordsMap.electronics;
      } else if (catNameLower.includes('แฟชั่น') || catNameLower.includes('fashion') || catNameLower.includes('เสื้อผ้า') || catNameLower.includes('clothing') || catNameLower.includes('apparel') || catNameLower.includes('accessories') || catNameLower.includes('accessory')) {
        keywordsData = categoryKeywordsMap.fashion;
      } else if (catNameLower.includes('ความงาม') || catNameLower.includes('beauty') || catNameLower.includes('เครื่องสำอาง') || catNameLower.includes('cosmetic') || catNameLower.includes('skincare') || catNameLower.includes('health') || catNameLower.includes('สุขภาพ')) {
        keywordsData = categoryKeywordsMap.beauty;
      } else if (catNameLower.includes('บ้าน') || catNameLower.includes('home') || catNameLower.includes('living') || catNameLower.includes('เฟอร์นิเจอร์') || catNameLower.includes('furniture')) {
        keywordsData = categoryKeywordsMap.home;
      } else if (catNameLower.includes('ครอบครัว') || catNameLower.includes('family') || catNameLower.includes('เด็ก') || catNameLower.includes('baby') || catNameLower.includes('kid') || catNameLower.includes('children')) {
        keywordsData = categoryKeywordsMap.family;
      } else if (catNameLower.includes('ของเล่น') || catNameLower.includes('toy') || catNameLower.includes('pet') || catNameLower.includes('สัตว์เลี้ยง') || catNameLower.includes('pets')) {
        keywordsData = categoryKeywordsMap.toys;
      }

      if (keywordsData) {
        // Insert regular keywords
        for (const keyword of keywordsData.keywords) {
          const isHighPriority = keywordsData.highPriority.includes(keyword);
          try {
            await executeQuery(
              `INSERT INTO category_keywords (category_id, keyword, is_high_priority) 
               VALUES (?, ?, ?) 
               ON DUPLICATE KEY UPDATE is_high_priority = VALUES(is_high_priority)`,
              [category.id, keyword, isHighPriority ? 1 : 0]
            );
            totalInserted++;
          } catch (error) {
            console.error(`Failed to insert keyword "${keyword}" for category ${category.name}:`, error.message);
          }
        }
        console.log(`✅ Inserted keywords for category: ${category.name} (${keywordsData.keywords.length} keywords)`);
      } else {
        console.log(`⚠️ No keyword mapping found for category: ${category.name}`);
      }
    }

    console.log(`✅ Migration completed! Total keywords inserted: ${totalInserted}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Only call process.exit if run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrate();
}

