export interface CategoryNode {
  name: string;
  subcategories?: string[];
}

export interface CategoryGroup {
  name: string;
  categories: CategoryNode[];
}

export const CATEGORIES_DATA = {
  goods: [
    {
      name: "Electronics",
      categories: [
        { name: "Smartphones & Accessories", subcategories: ["Cases & Covers", "Screen Protectors", "Chargers & Cables", "Power Banks", "Mounts & Stands", "Stylus Pens"] },
        { name: "Computers & Laptops", subcategories: ["Laptops", "Desktops", "All-in-One PCs", "Monitors", "Computer Accessories"] },
        { name: "Tablets & e-Readers", subcategories: ["Tablets", "e-Readers", "Tablet Accessories"] },
        { name: "Audio", subcategories: ["Headphones & Earphones", "Speakers (Bluetooth, Smart)", "Home Audio Systems", "Microphones", "Audio Accessories"] },
        { name: "Wearable Technology", subcategories: ["Smartwatches", "Fitness Trackers", "Smart Rings", "VR Headsets", "Accessories"] },
        { name: "Cameras & Photography", subcategories: ["DSLR & Mirrorless Cameras", "Lenses", "Action Cameras", "Drones", "Camera Accessories"] },
        { name: "TV & Home Theater", subcategories: ["Televisions", "Projectors & Screens", "Streaming Devices", "TV Mounts & Stands", "Remote Controls"] },
        { name: "Gaming", subcategories: ["Consoles", "Gaming PCs & Laptops", "Controllers & Joysticks", "Gaming Headsets", "Gaming Chairs & Desks", "VR Gaming"] },
        { name: "Smart Home Devices", subcategories: ["Smart Displays & Hubs", "Smart Plugs & Lights", "Smart Thermostats", "Security Cameras & Doorbells", "Smart Locks"] },
        { name: "Networking & Internet", subcategories: ["Routers & Mesh Systems", "Modems", "Network Switches", "Cables & Adapters"] },
        { name: "Batteries & Power", subcategories: ["Rechargeable Batteries", "Power Adapters & Inverters", "Surge Protectors"] },
        { name: "Printers & Scanners", subcategories: ["Inkjet & Laser Printers", "3D Printers", "Scanners", "Ink & Toner"] }
      ]
    },
    {
      name: "Fashion",
      categories: [
        { name: "Women’s Clothing", subcategories: ["Dresses", "Tops & T-Shirts", "Jeans & Pants", "Skirts", "Outerwear", "Activewear", "Lingerie & Sleepwear", "Swimwear", "Ethnic & Traditional Wear", "Maternity"] },
        { name: "Men’s Clothing", subcategories: ["Shirts & Polos", "T-Shirts & Tanks", "Jeans & Trousers", "Shorts", "Suits & Blazers", "Outerwear", "Activewear", "Underwear & Sleepwear", "Swimwear", "Ethnic Wear"] },
        { name: "Kids & Baby Clothing", subcategories: ["Baby (0-24 months)", "Girls (2-14 years)", "Boys (2-14 years)", "School Uniforms"] },
        { name: "Shoes", subcategories: ["Women’s", "Men’s", "Kids’ Shoes", "Sports & Performance Shoes", "Slippers & Flip-Flops"] },
        { name: "Accessories", subcategories: ["Bags & Wallets", "Jewelry", "Belts & Suspenders", "Hats, Scarves & Gloves", "Sunglasses & Eyewear", "Hair Accessories", "Keychains & Key Cases"] },
        { name: "Luggage & Travel Gear", subcategories: ["Suitcases & Trolleys", "Travel Bags & Duffels", "Travel Organizers", "Passport Holders & Tags"] }
      ]
    },
    {
      name: "Home & Garden",
      categories: [
        { name: "Furniture", subcategories: ["Living Room", "Bedroom", "Dining", "Office", "Kids’ Furniture", "Outdoor Furniture"] },
        { name: "Home Décor", subcategories: ["Rugs & Carpets", "Curtains & Blinds", "Wall Art & Posters", "Mirrors", "Vases & Artificial Plants", "Clocks", "Candles & Fragrances"] },
        { name: "Kitchen & Dining", subcategories: ["Cookware", "Bakeware", "Knives & Cutting Boards", "Kitchen Gadgets & Tools", "Dinnerware & Serveware", "Drinkware & Glassware", "Table Linens", "Food Storage & Containers", "Small Appliances"] },
        { name: "Home Appliances", subcategories: ["Refrigerators & Freezers", "Washing Machines & Dryers", "Dishwashers", "Microwaves & Ovens", "Vacuum Cleaners & Floor Care", "Air Conditioners & Fans", "Heaters & Water Heaters", "Air Purifiers & Humidifiers"] },
        { name: "Bedding & Bath", subcategories: ["Bed Sheets & Pillowcases", "Duvets & Comforters", "Pillows", "Blankets & Throws", "Towels & Bathrobes", "Bath Mats", "Shower Curtains"] },
        { name: "Garden & Outdoor", subcategories: ["Plants, Seeds & Bulbs", "Pots & Planters", "Garden Tools", "Outdoor Structures", "Grills & BBQ", "Outdoor Lighting", "Pest Control", "Watering & Irrigation"] },
        { name: "Home Improvement", subcategories: ["Paint & Supplies", "Building Materials", "Plumbing Supplies", "Electrical Supplies", "Hardware", "Flooring & Tiles"] },
        { name: "Home Organization", subcategories: ["Shelves & Bookcases", "Baskets & Bins", "Closet Organizers", "Hooks & Racks"] }
      ]
    },
    {
      name: "Health & Beauty",
      categories: [
        { name: "Skincare", subcategories: ["Face", "Body", "Lip Care", "Eye Care", "Sets & Kits"] },
        { name: "Makeup", subcategories: ["Face", "Eyes", "Lips", "Makeup Tools & Brushes"] },
        { name: "Hair Care", subcategories: ["Shampoo & Conditioner", "Styling Products", "Hair Color", "Hair Tools", "Hair Accessories"] },
        { name: "Fragrance", subcategories: ["Women’s Perfume", "Men’s Cologne", "Unisex", "Home Fragrance"] },
        { name: "Personal Care", subcategories: ["Bath & Shower", "Deodorants & Antiperspirants", "Shaving & Waxing", "Feminine Care", "Men’s Grooming", "Oral Care"] },
        { name: "Vitamins & Supplements", subcategories: ["Multivitamins", "Minerals", "Herbal Supplements", "Sports Nutrition"] },
        { name: "Health Devices & Supplies", subcategories: ["Blood Pressure Monitors", "Thermometers", "Massagers & TENS Units", "First Aid Supplies", "Braces & Supports"] },
        { name: "Wellness & Sexual Health", subcategories: ["Essential Oils & Aromatherapy", "Condoms & Lubricants", "Intimate Toys"] }
      ]
    },
    {
      name: "Sports & Outdoors",
      categories: [
        { name: "Exercise & Fitness", subcategories: ["Treadmills, Exercise Bikes, Ellipticals", "Strength Training", "Yoga & Pilates", "Resistance Bands & Tubes", "Boxing & Martial Arts"] },
        { name: "Outdoor Recreation", subcategories: ["Camping & Hiking", "Climbing Gear", "Cycling", "Water Sports", "Winter Sports", "Fishing", "Hunting & Shooting"] },
        { name: "Team Sports", subcategories: ["Football/Soccer", "Basketball", "Volleyball", "Baseball & Softball", "Cricket", "Rugby"] },
        { name: "Racquet Sports", subcategories: ["Tennis", "Badminton", "Squash"] },
        { name: "Golf", subcategories: ["Clubs", "Bags", "Balls", "Apparel"] },
        { name: "Fan Shop & Sports Memorabilia", subcategories: ["Jerseys & Apparel", "Collectibles"] }
      ]
    },
    {
      name: "Toys & Games",
      categories: [
        { name: "Action Figures & Playsets" },
        { name: "Dolls & Accessories" },
        { name: "Building & Construction Toys" },
        { name: "Puzzles & Brain Teasers" },
        { name: "Board Games & Card Games" },
        { name: "Remote Control & Play Vehicles" },
        { name: "Educational & STEM Toys" },
        { name: "Pretend Play & Dress-Up" },
        { name: "Arts & Crafts for Kids" },
        { name: "Party Supplies & Decorations" }
      ]
    },
    {
      name: "Automotive",
      categories: [
        { name: "Car Care & Detailing", subcategories: ["Wax, Polish, Wash Soap", "Cloths & Brushes"] },
        { name: "Oils & Fluids" },
        { name: "Replacement Parts", subcategories: ["Brake Pads", "Filters", "Spark Plugs"] },
        { name: "Tires & Wheels", subcategories: ["Tires", "Rims", "Tire Accessories"] },
        { name: "Interior Accessories", subcategories: ["Seat Covers", "Floor Mats", "Phone Mounts", "Dash Cams", "Air Fresheners"] },
        { name: "Exterior Accessories", subcategories: ["Car Covers", "Bumper Guards", "Roof Racks & Cargo Carriers"] },
        { name: "Tools & Equipment", subcategories: ["Jacks", "Wrenches", "Jump Starters"] },
        { name: "Motorcycle & Powersports", subcategories: ["Helmets & Gear", "Parts & Accessories"] },
        { name: "Car Electronics", subcategories: ["Stereos, Speakers, Amplifiers", "GPS & Navigation"] }
      ]
    },
    {
      name: "Grocery & Gourmet",
      categories: [
        { name: "Fresh Produce" },
        { name: "Meat & Seafood" },
        { name: "Dairy, Eggs & Cheese" },
        { name: "Bread & Bakery" },
        { name: "Pantry Staples", subcategories: ["Rice, Pasta, Grains", "Cooking Oils, Vinegars", "Spices & Seasonings", "Canned & Jarred Goods"] },
        { name: "Snacks & Sweets", subcategories: ["Chips", "Nuts", "Chocolate", "Candy"] },
        { name: "Beverages", subcategories: ["Coffee, Tea, Hot Chocolate", "Soft Drinks & Juices", "Water & Sparkling Water", "Alcoholic"] },
        { name: "Frozen Foods", subcategories: ["Frozen Meals", "Vegetables", "Ice Cream"] },
        { name: "Specialty & Gourmet", subcategories: ["Organic", "Gluten-Free", "Vegan", "Gift Baskets & Hampers", "International Foods"] },
        { name: "Pet Food" }
      ]
    },
    {
      name: "Books & Media",
      categories: [
        { name: "Books", subcategories: ["Fiction", "Non-Fiction", "Children’s", "Textbooks & Education"] },
        { name: "Audiobooks" },
        { name: "eBooks" },
        { name: "Music" },
        { name: "Movies & TV Shows" },
        { name: "Magazines & Newspapers" }
      ]
    },
    {
      name: "Office Supplies",
      categories: [
        { name: "Paper & Notebooks" },
        { name: "Pens, Pencils & Markers" },
        { name: "Filing & Binders" },
        { name: "Desk Organizers & Accessories" },
        { name: "Calendars & Planners" },
        { name: "Presentation Supplies" },
        { name: "Mailing & Shipping Supplies" },
        { name: "School & Education Supplies" }
      ]
    },
    {
      name: "Pet Supplies",
      categories: [
        { name: "Dog", subcategories: ["Food", "Treats", "Toys", "Beds", "Collars/Leashes", "Grooming"] },
        { name: "Cat", subcategories: ["Food", "Litter", "Toys", "Trees", "Carriers"] },
        { name: "Fish & Aquatics" },
        { name: "Birds" },
        { name: "Small Animals" },
        { name: "Pet Health & Wellness Supplements" }
      ]
    },
    {
      name: "Baby Products",
      categories: [
        { name: "Diapers & Wipes" },
        { name: "Feeding", subcategories: ["Bottles", "Breast Pumps", "High Chairs"] },
        { name: "Nursery", subcategories: ["Cribs", "Bedding", "Monitors"] },
        { name: "Baby Gear", subcategories: ["Strollers", "Car Seats", "Carriers"] },
        { name: "Baby Toys & Gifts" },
        { name: "Baby Safety", subcategories: ["Gates", "Locks"] }
      ]
    },
    {
      name: "Tools & Home Improvement",
      categories: [
        { name: "Power Tools", subcategories: ["Drills", "Saws", "Sanders"] },
        { name: "Hand Tools", subcategories: ["Hammers", "Screwdrivers", "Wrenches"] },
        { name: "Tool Storage", subcategories: ["Boxes", "Belts"] },
        { name: "Ladders & Scaffolding" },
        { name: "Safety Equipment", subcategories: ["Gloves", "Goggles"] },
        { name: "Electrical", subcategories: ["Wires", "Switches", "Outlets"] },
        { name: "Plumbing", subcategories: ["Pipes", "Fittings", "Faucets"] }
      ]
    },
    {
      name: "Arts, Crafts & Hobbies",
      categories: [
        { name: "Painting, Drawing & Art Supplies" },
        { name: "Scrapbooking & Stamping" },
        { name: "Knitting & Crochet" },
        { name: "Sewing & Quilting" },
        { name: "Model Making & Kit Building" },
        { name: "Candle & Soap Making" },
        { name: "Jewelry Making & Beading" },
        { name: "Printmaking & Sculpting" }
      ]
    },
    {
      name: "Musical Instruments & Gear",
      categories: [
        { name: "Guitars & Basses" },
        { name: "Keyboards & Pianos" },
        { name: "Drums & Percussion" },
        { name: "Wind & Brass Instruments" },
        { name: "Orchestral Strings" },
        { name: "Studio & Recording Equipment" },
        { name: "DJ & Lighting Gear" },
        { name: "Accessories", subcategories: ["Cables", "Stands", "Picks"] }
      ]
    },
    {
      name: "Industrial & Scientific",
      categories: [
        { name: "Lab Equipment" },
        { name: "Medical Supplies & Devices" },
        { name: "Safety & Protective Gear" },
        { name: "Janitorial & Sanitation" },
        { name: "Electrical & Testing Equipment" },
        { name: "Material Handling", subcategories: ["Carts", "Shelving"] }
      ]
    },
    {
      name: "Digital Goods",
      categories: [
        { name: "Software & Apps", subcategories: ["Productivity", "Creative", "Utilities"] },
        { name: "e-Learning & Online Courses" },
        { name: "Digital Art & Stock Media" },
        { name: "eBooks & PDFs" },
        { name: "Music & Audio Samples" },
        { name: "Fonts & Graphics" },
        { name: "Website Themes & Templates" },
        { name: "Gaming Keys & In-Game Items" },
        { name: "Gift Cards" }
      ]
    }
  ],
  services: [
    {
      name: "Home Services",
      categories: [
        { name: "Cleaning & Housekeeping" },
        { name: "Plumbing, Electrical, Handyman" },
        { name: "Painting & Renovation" },
        { name: "Pest Control" },
        { name: "Moving & Junk Removal" },
        { name: "Landscaping & Lawn Care" },
        { name: "Appliance Repair" }
      ]
    },
    {
      name: "Professional Services",
      categories: [
        { name: "Business Consulting" },
        { name: "Legal Services" },
        { name: "Accounting & Tax" },
        { name: "Graphic Design & Branding" },
        { name: "Web Development & IT Support" },
        { name: "Content Writing & Translation" },
        { name: "Photography & Videography" }
      ]
    },
    {
      name: "Education & Tutoring",
      categories: [
        { name: "Academic Tutoring", subcategories: ["Math", "Science", "Languages"] },
        { name: "Test Preparation", subcategories: ["SAT", "IELTS"] },
        { name: "Music & Art Lessons" },
        { name: "Online Courses & Workshops" },
        { name: "Professional Certifications" }
      ]
    },
    {
      name: "Travel & Experiences",
      categories: [
        { name: "Hotels & Accommodation Booking" },
        { name: "Tour Packages & Guided Tours" },
        { name: "Activity Booking", subcategories: ["Scuba", "Hiking", "Cooking Classes"] },
        { name: "Event Tickets", subcategories: ["Concerts", "Sports", "Theatre"] },
        { name: "Car Rentals & Chauffeur Services" }
      ]
    },
    {
      name: "Beauty & Wellness Appointments",
      categories: [
        { name: "Haircut & Styling" },
        { name: "Spa & Massage" },
        { name: "Manicure & Pedicure" },
        { name: "Facial & Skincare Treatments" },
        { name: "Personal Training & Fitness Classes" },
        { name: "Yoga & Meditation Sessions" }
      ]
    },
    {
      name: "Automotive Services",
      categories: [
        { name: "Car Wash & Detailing" },
        { name: "Oil Change & Maintenance" },
        { name: "Tire Rotation & Replacement" },
        { name: "Repair & Diagnostics" }
      ]
    },
    {
      name: "Event Services",
      categories: [
        { name: "Catering & Personal Chef" },
        { name: "Photography & Videography for Events" },
        { name: "Event Planning & Coordination" },
        { name: "Party Rentals", subcategories: ["Bounce Houses", "Tents"] }
      ]
    },
    {
      name: "Pet Services",
      categories: [
        { name: "Pet Grooming" },
        { name: "Veterinary Services" },
        { name: "Pet Sitting & Boarding" },
        { name: "Dog Walking" }
      ]
    },
    {
      name: "Subscriptions & Memberships",
      categories: [
        { name: "Monthly Boxes", subcategories: ["Beauty", "Food", "Toys"] },
        { name: "Gym Memberships" },
        { name: "Streaming Services" },
        { name: "Software-as-a-Service" },
        { name: "Meal Kits & Recipe Subscriptions" }
      ]
    },
    {
      name: "Financial & Insurance",
      categories: [
        { name: "Insurance", subcategories: ["Travel", "Health", "Auto", "Home"] },
        { name: "Loan & Credit Services" },
        { name: "Financial Planning" }
      ]
    },
    {
      name: "Printing & Customization",
      categories: [
        { name: "T-Shirt & Apparel Printing" },
        { name: "Business Card & Flyer Printing" },
        { name: "Custom Gifts & Engraving" },
        { name: "3D Printing Services" }
      ]
    }
  ]
};
