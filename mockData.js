window.mockData = (function() {
  // --- Generate 200 Properties ---
  const districts = ['大安區', '中山區', '信義區', '中正區', '松山區', '大同區', '萬華區', '文山區', '南港區', '內湖區'];
  const types = ['雅房', '套房', '整層住家'];
  const prefixes = ['文青', '簡約', '質感', '寬敞', '明亮', '舒適', '高樓景觀', '台水電', '可貓', '獨立陽台', '全新裝潢', '採光極佳'];
  const suffixes = ['精緻房', '小木屋', '大空間', '靜巷美屋', '捷運宅', '綠意房', '設計款', '溫馨窩'];
  
  // Define bounding box for districts (assuming map image is 2000x2000)
  // X: 0~100%, Y: 0~100%. Adjust ranges visually to match Taipei MRT map roughly.
  const districtBounds = {
    '大安區': { minX: 45, maxX: 60, minY: 55, maxY: 65 }, // Center-South
    '中山區': { minX: 40, maxX: 55, minY: 35, maxY: 50 }, // Center-North
    '信義區': { minX: 65, maxX: 80, minY: 55, maxY: 65 }, // East
    '中正區': { minX: 35, maxX: 50, minY: 50, maxY: 60 }, // Center-West
    '松山區': { minX: 55, maxX: 70, minY: 40, maxY: 50 }, // East-North
    '大同區': { minX: 30, maxX: 40, minY: 35, maxY: 45 }, // West-North
    '萬華區': { minX: 20, maxX: 35, minY: 50, maxY: 65 }, // West
    '文山區': { minX: 45, maxX: 65, minY: 75, maxY: 90 }, // South
    '南港區': { minX: 75, maxX: 95, minY: 45, maxY: 55 }, // Far East
    '內湖區': { minX: 60, maxX: 85, minY: 20, maxY: 35 }  // Far North-East
  };
  
  const properties = [];
  for (let i = 1; i <= 200; i++) {
    const isSubsidy = Math.random() > 0.3; // 70% chance
    const priceBucket = (i - 1) % 10;
    let type = '雅房';
    let price = 8000;
    if (priceBucket <= 3) {
      // 40%: 10,000 以下
      type = priceBucket % 2 === 0 ? '雅房' : '套房';
      price = 6500 + Math.floor(Math.random() * 4) * 800;
    } else if (priceBucket <= 6) {
      // 30%: 10,000 - 15,000
      type = priceBucket % 2 === 0 ? '套房' : '雅房';
      price = 11000 + Math.floor(Math.random() * 6) * 700;
    } else if (priceBucket <= 8) {
      // 20%: 15,000 - 20,000
      type = priceBucket % 2 === 0 ? '套房' : '整層住家';
      price = 15000 + Math.floor(Math.random() * 6) * 800;
    } else {
      // 10%: 20,000 以上
      type = '整層住家';
      price = 21000 + Math.floor(Math.random() * 9) * 1500;
    }
    
    const dist = districts[i % districts.length];
    const bounds = districtBounds[dist];
    const mapX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
    const mapY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    
    const pre = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
    const rating = (4 + Math.random()).toFixed(1);
    
    properties.push({
      id: 1000 + i,
      title: `${dist} ${pre}${suf} ${type}`,
      address: `台北市${dist}XX路XX號`,
      district: dist,
      price: price,
      size: 5 + Math.floor(Math.random() * 25),
      type: type,
      subsidy: isSubsidy,
      images: [
        `https://images.unsplash.com/photo-${1500000000000 + (i%50) * 10000}?w=800&h=600&fit=crop`
      ],
      aiMatch: 60 + Math.floor(Math.random() * 38),
      mapX: mapX,
      mapY: mapY,
      landlord: { rating: rating },
      reviews: Array(Math.floor(Math.random() * 20) + 1).fill(0)
    });
  }
  
  // Safe sample images
  const sampleImages = [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop'
  ];
  properties.forEach((p, i) => p.images[0] = sampleImages[i % sampleImages.length]);

  // --- Generate 20 Roommates with logic attributes ---
  const roommateNames = ['林大志', '陳小如', '王彥文', '張嘉慧', '李明翰', '黃佳玲', '吳柏毅', '劉子瑜', '蔡秉叡', '楊宜蓁', '許建國', '鄭欣宜', '謝承恩', '郭品妤', '洪偉哲', '邱郁婷', '曾俊傑', '廖家儀', '賴柏宇', '徐珮琪'];
  const depts = ['資工系', '設計系', '企管系', '電機系', '機械系', '化工系', '材資系', '土木系', '光電系', '建都所'];
  
  const roommates = [];
  for (let i = 0; i < 20; i++) {
    // Random traits to calculate match score dynamically later
    // Q1: Sleep (0=early, 1=mid, 2=late)
    // Q3: Pet (0=love, 1=ok, 2=hate)
    // Q4: Clean (0=neatfreak, 1=weekly, 2=messy)
    // Q8: Cook (0=no, 1=sometimes, 2=everyday)
    // Q10: Rent (0=AA, 1=pool, 2=casual)
    roommates.push({
      id: 2000 + i,
      name: roommateNames[i],
      dept: `${depts[i % depts.length]} ${1 + Math.floor(Math.random()*4)} 年級`,
      tags: ['早睡早起', '愛乾淨', '不抽菸', '偶爾帶朋友', '有養貓', '隨和', '晚睡'].sort(() => 0.5 - Math.random()).slice(0, 3),
      img: `https://i.pravatar.cc/150?img=${10 + i}`,
      traits: {
        sleep: Math.floor(Math.random() * 3),
        pet: Math.floor(Math.random() * 3),
        clean: Math.floor(Math.random() * 3),
        cook: Math.floor(Math.random() * 3),
        rent: Math.floor(Math.random() * 3)
      },
      match: 0 // Will be calculated dynamically
    });
  }

  // --- Generate Landlord Dashboard Data ---
  const llProperties = [];
  const llTenants = [];
  const llContracts = [];
  const llPayments = [];
  const llRepairs = [];
  const llTaxes = [];
  
  // Create 5 coherent stories
  const stories = [
    {
      propName: '大安區 靜巷美套房', address: '台北市大安區和平東路二段',
      price: 18000, status: '出租中', tenant: '陳信宏',
      contractStart: '2025-08-01', contractEnd: '2026-07-31',
      paymentStatus: '已繳清', repairIssue: '無', repairStatus: '無',
      taxStatus: '符合公益出租'
    },
    {
      propName: '中山區 捷運高樓景觀', address: '台北市中山區南京東路三段',
      price: 25000, status: '出租中', tenant: '林依晨',
      contractStart: '2025-10-15', contractEnd: '2026-10-14',
      paymentStatus: '逾期未繳', repairIssue: '冷氣不冷', repairStatus: '處理中',
      taxStatus: '符合公益出租'
    },
    {
      propName: '信義區 簡約一房一廳', address: '台北市信義區信義路五段',
      price: 32000, status: '出租中', tenant: '周杰倫',
      contractStart: '2026-02-01', contractEnd: '2027-01-31',
      paymentStatus: '已繳清', repairIssue: '熱水器故障', repairStatus: '已結案',
      taxStatus: '不符合 (無申請租補)'
    },
    {
      propName: '松山區 溫馨小雅房', address: '台北市松山區民生東路四段',
      price: 9000, status: '待簽約', tenant: '蔡依林',
      contractStart: '-', contractEnd: '-',
      paymentStatus: '-', repairIssue: '無', repairStatus: '無',
      taxStatus: '審核中'
    },
    {
      propName: '中正區 北車通勤宅', address: '台北市中正區羅斯福路一段',
      price: 15000, status: '空置中', tenant: null,
      contractStart: '-', contractEnd: '-',
      paymentStatus: '-', repairIssue: '全室油漆粉刷', repairStatus: '處理中',
      taxStatus: '無租約'
    }
  ];

  stories.forEach((story, i) => {
    const isRented = story.status === '出租中';
    const isPending = story.status === '待簽約';

    llProperties.push({
      id: 3000 + i,
      name: story.propName,
      address: story.address,
      status: story.status,
      price: story.price,
      tenant: story.tenant,
      nextDate: isRented ? '2026-07-05' : null,
    });
    
    if (isRented || isPending) {
      llTenants.push({
        name: story.tenant,
        target: story.propName,
        status: isRented ? '審核通過' : '審核中',
        date: isRented ? story.contractStart : '2026-06-10'
      });
    }

    if (isRented) {
      llContracts.push({
        target: story.propName,
        tenant: story.tenant,
        endDate: story.contractEnd,
        status: '生效中'
      });
      
      llPayments.push({
        target: story.propName,
        tenant: story.tenant,
        amount: story.price,
        dueDate: '2026-06-05',
        status: story.paymentStatus
      });
    }

    if (story.repairIssue !== '無') {
      llRepairs.push({
        target: story.propName,
        issue: story.repairIssue,
        date: '2026-06-01',
        status: story.repairStatus
      });
    }
    
    if (isRented || isPending) {
       llTaxes.push({
         target: story.propName,
         rentIncome: story.price * 12,
         savedTax: story.taxStatus.includes('符合') ? 14400 : 0,
         status: story.taxStatus
       });
    }
  });

  return {
    properties,
    roommates,
    landlord: {
      properties: llProperties,
      tenants: llTenants,
      contracts: llContracts,
      payments: llPayments,
      repairs: llRepairs,
      taxes: llTaxes
    }
  };
})();
