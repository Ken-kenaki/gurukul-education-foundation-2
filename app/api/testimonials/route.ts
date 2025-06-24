import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID } from "node-appwrite";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { databases, storage } = await createAdminClient();
    
    const queries = [];
    if (status) {
      queries.push(`status="${status}"`);
    }

    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.collections.testimonials,
      queries
    );

    // Enhance with image URLs
    const enhancedDocuments = response.documents.map((doc: any) => ({
      ...doc,
      imageUrl: doc.imageId 
        ? storage.getFilePreview(appwriteConfig.buckets.testimonials, doc.imageId, 200, 200).href
        : null
    }));

    return NextResponse.json({ documents: enhancedDocuments, total: response.total });
  } catch (error: any) {
    console.error("Testimonials API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { databases, storage } = await createAdminClient();
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const program = formData.get('program') as string;
    const university = formData.get('university') as string;
    const content = formData.get('content') as string;
    const rating = parseInt(formData.get('rating') as string);
    const file = formData.get('file') as File | null;

    if (!name || !program || !university || !content || !rating) {
      return NextResponse.json(
        { error: "All fields except image are required" },
        { status: 400 }
      );
    }

    let imageId = null;
    if (file) {
      const fileId = ID.unique();
      await storage.createFile(appwriteConfig.buckets.testimonials, fileId, file);
      imageId = fileId;
    }

    const testimonial = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collections.testimonials,
      ID.unique(),
      {
        name,
        program,
        university,
        content,
        rating,
        imageId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error: any) {
    console.error("Create Testimonial Error:", error);
    return NextResponse.json(
      { error: "Failed to create testimonial", details: error.message },
      { status: 500 }
    );
  }
}