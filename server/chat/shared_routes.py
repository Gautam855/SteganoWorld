import logging
from flask import Blueprint, request, jsonify
from chat.database import db
from chat.models import SharedLink, SharedLinkAccess, ChatUser
from chat.auth import token_required

logger = logging.getLogger('SteganoWorld.SharedLinks')

shared_bp = Blueprint('shared', __name__, url_prefix='/api/chat/shared')

@shared_bp.route('/create', methods=['POST'])
@token_required
def create_link(current_user_id, current_username):
    """
    Create a new secure shared link.
    Payload: {
        "image_id": "123-abc...",
        "access_list": [
            {"user_id": "user-uuid", "encrypted_aes_key": "base64..."},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        image_id = data.get('image_id')
        access_list = data.get('access_list', [])
        burn_after_views = int(data.get('burn_after_views', 0))

        if not image_id or not access_list:
            return jsonify({'error': 'image_id and access_list are required'}), 400

        # Create SharedLink
        link = SharedLink(
            owner_id=current_user_id, 
            image_id=image_id,
            burn_after_views=burn_after_views
        )
        db.session.add(link)
        db.session.flush() # to get link.id

        # Add Access Records
        for access in access_list:
            user_id = access.get('user_id')
            enc_key = access.get('encrypted_aes_key')
            
            if user_id and enc_key:
                access_record = SharedLinkAccess(
                    link_id=link.id,
                    user_id=user_id,
                    encrypted_aes_key=enc_key
                )
                db.session.add(access_record)

        db.session.commit()
        logger.info(f"User {current_username} created shared link {link.id} for image {image_id}")
        
        return jsonify({
            'success': True,
            'link_id': link.id,
            'image_id': image_id
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating shared link: {str(e)}")
        return jsonify({'error': 'Failed to create link'}), 500


@shared_bp.route('/<link_id>', methods=['GET'])
@token_required
def get_link(current_user_id, current_username, link_id):
    """
    Access a shared link.
    Returns the image ID and the current user's specific encrypted AES key if authorized.
    """
    try:
        link = SharedLink.query.get(link_id)
        if not link:
            return jsonify({'error': 'Link not found or expired', 'authorized': False}), 404

        # Check if user has access or is the owner
        access_record = SharedLinkAccess.query.filter_by(link_id=link_id, user_id=current_user_id).first()
        
        if not access_record and link.owner_id != current_user_id:
            return jsonify({'error': 'You do not have access to this hidden data', 'authorized': False}), 403

        # Prepare core response
        owner = ChatUser.query.get(link.owner_id)
        is_owner = (link.owner_id == current_user_id)
        
        # Ephemerality / Burn checks
        destroyed_now = False
        views_left = None
        
        if link.burn_after_views > 0:
            if link.views_count >= link.burn_after_views:
                return jsonify({'error': 'This secure link was burned and is no longer available.', 'authorized': False}), 410
                
            if not is_owner:
                link.views_count += 1
                views_left = link.burn_after_views - link.views_count
                
                if link.views_count >= link.burn_after_views:
                    destroyed_now = True
                    db.session.delete(link)
                else:
                    db.session.add(link)
                db.session.commit()
            else:
                views_left = link.burn_after_views - link.views_count
                
        return jsonify({
            'success': True,
            'authorized': True,
            'image_id': link.image_id,
            'encrypted_aes_key': access_record.encrypted_aes_key if access_record else None,
            'is_owner': is_owner,
            'owner_name': owner.display_name if owner else 'Unknown',
            'burn_after_views': link.burn_after_views,
            'views_left': views_left,
            'destroyed_now': destroyed_now
        }), 200

    except Exception as e:
        logger.error(f"Error accessing shared link: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
