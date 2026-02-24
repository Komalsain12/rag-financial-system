import csv, random

vendors = ["ABC Supplies", "Unknown Vendor Ltd", "XYZ Tech", "Travel Co", "City Cafe"]
categories = ["Office Supplies", "Travel", "Meals", "Software", "Equipment"]

with open('test_invoices.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['invoice_id', 'vendor', 'amount', 'has_gst', 'correct_category', 'correct_decision'])
    for i in range(100):
        vendor = random.choice(vendors)
        amount = random.randint(200, 15000)
        has_gst = random.choice([True, False])
        category = random.choice(categories)
        # Simple rule: approved if small amount AND has GST
        decision = "Approved" if amount < 5000 and has_gst else "Needs Review"
        writer.writerow([f'INV-{i+1:03d}', vendor, amount, has_gst, category, decision])

print("Generated 100 test invoices in test_invoices.csv")